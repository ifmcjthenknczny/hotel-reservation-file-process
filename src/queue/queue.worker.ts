import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { Task } from 'src/tasks/tasks.schema';
import { QUEUE_NAME } from './queue.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReservationService } from 'src/reservation/reservation.service';
import { TasksService } from 'src/tasks/tasks.service';
import {
  RESERVATION_PROPERTIES,
  ReservationDto,
} from 'src/reservation/reservation.dto';
import { Logger } from 'nestjs-pino';
import {
  formatReportDuplicationReportMessage,
  formatReportValidationErrorMessage,
} from '~/helpers/validation';
import { areSetsEqual, mergeHeadersWithValues } from '~/helpers/object';

const XLSX_COLUMN_RANGE = RESERVATION_PROPERTIES.length;
const MAX_XLSX_ROWS = 1_048_576;

@Processor(QUEUE_NAME)
@Injectable()
export class QueueWorker extends WorkerHost {
  constructor(
    private readonly tasksService: TasksService,
    private readonly reservationService: ReservationService,
    private readonly logger: Logger,
  ) {
    super();
  }

  async process(job: Job<Task>): Promise<void> {
    const { filePath, taskId } = job.data;
    let validationSuccessful = true;

    try {
      this.logger.log(`Processing file: ${filePath}`);
      await this.tasksService.updateTask(taskId, { status: 'IN_PROGRESS' });

      const worksheet = await this.loadFirstWorksheet(filePath);

      const header = this.readHeaderArray(worksheet);
      const reservationIds: Set<ReservationDto['reservation_id']> = new Set();

      let maxRowNumber =
        xlsx.utils.decode_range(worksheet['!ref'] || '').e.r ?? MAX_XLSX_ROWS;

      if (!maxRowNumber || maxRowNumber === 1) {
        await this.failTask(
          taskId,
          `Task ${taskId} failed, xlsx file does not contain any data.`,
        );
        return;
      }

      const updatedMaxRowNumber = await this.readFileRowByRow(
        worksheet,
        async (rowJson: ReservationDto, rowNumber: number) => {
          const isValid = await this.validateRow(
            taskId,
            rowJson,
            rowNumber,
            reservationIds,
          );
          if (!isValid) {
            validationSuccessful = false;
          }
        },
        { maxRowNumber, header },
      );

      if (!validationSuccessful) {
        await this.failTask(
          taskId,
          `Task ${taskId} failed, due to validation errors.`,
        );
        return;
      }

      if (updatedMaxRowNumber) {
        maxRowNumber = updatedMaxRowNumber;
      }

      // separate loop for memory optimization
      await this.readFileRowByRow(
        worksheet,
        (rowJson: ReservationDto) =>
          this.reservationService.processReservation(rowJson),
        { maxRowNumber, header },
      );

      await this.tasksService.updateTask(taskId, { status: 'COMPLETED' });
      this.logger.log(`Task ${taskId} successfully completed.`);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.tasksService.updateTask(taskId, {
        status: 'FAILED',
        failReason: errorMessage,
        reportPath: this.tasksService.getReportPath(taskId),
      });
      this.logger.error(`Error while processing task ${taskId}:`, errorMessage);
    } finally {
      await this.deleteFile(filePath);
    }
  }

  async readFileRowByRow<T extends Record<string, any>>(
    worksheet: xlsx.WorkSheet,
    callback: (rowJson: T, rowNumber?: number) => Promise<void>,
    { maxRowNumber, header }: { maxRowNumber: number; header: (keyof T)[] },
  ) {
    for (let rowNumber = 2; rowNumber < maxRowNumber; rowNumber++) {
      const rowIndex = rowNumber - 1;

      const rowJson = this.readJsonRow<T>(worksheet, rowIndex, header);

      if (this.isRowEmpty(rowJson)) {
        return rowNumber;
      }

      await callback(rowJson, rowNumber);
    }
  }

  readRow(worksheet: xlsx.WorkSheet, rowIndex: number): (string | null)[] {
    const rowData: (string | null)[] = [];
    for (let col = 0; col < XLSX_COLUMN_RANGE; col++) {
      const cellAddress = xlsx.utils.encode_cell({ r: rowIndex, c: col });
      rowData.push((worksheet[cellAddress] as { w?: string })?.w ?? null);
    }
    return rowData;
  }

  readHeaderArray(worksheet: xlsx.WorkSheet) {
    const headers = this.readRow(worksheet, 0);
    const expectedHeaders = new Set(RESERVATION_PROPERTIES);
    const actualHeadersSet = new Set(headers);

    if (!areSetsEqual(actualHeadersSet, expectedHeaders)) {
      throw new Error(
        `Invalid headers. Expected: ${[...expectedHeaders].join(', ')}, Found: ${[...actualHeadersSet].join(', ')}`,
      );
    }
    return headers as (keyof ReservationDto)[];
  }

  readJsonRow<T extends Record<string, any>>(
    worksheet: xlsx.WorkSheet,
    rowIndex: number,
    header: (keyof T)[],
  ): T {
    const rowValues = this.readRow(worksheet, rowIndex);
    return mergeHeadersWithValues(header, rowValues);
  }

  async loadFirstWorksheet(filePath: string) {
    const workbook = xlsx.read(await fs.promises.readFile(filePath), {
      type: 'buffer',
    });
    const sheetName = workbook.SheetNames[0];
    return workbook.Sheets[sheetName];
  }

  async validateRow(
    taskId: string,
    rowContent: ReservationDto,
    rowNumber: number,
    reservationIds: Set<ReservationDto['reservation_id']>,
  ) {
    try {
      const reservation = plainToInstance(ReservationDto, rowContent);
      const validationErrors = await validate(reservation);
      const uniqueFieldName: keyof ReservationDto = 'reservation_id';
      const errorsContent: string[] = [];

      if (validationErrors.length) {
        const errors = validationErrors.map((error) =>
          formatReportValidationErrorMessage(
            Object.values(error.constraints || {}).join(', ') ||
              `Unidentified problem with column ${error.property}`,
            rowNumber,
          ),
        );
        errorsContent.push(
          ...validationErrors.map((error) =>
            formatReportValidationErrorMessage(
              Object.values(error.constraints || {}).join(', ') ||
                `Unidentified problem with column ${error.property}`,
              rowNumber,
            ),
          ),
        );
        await this.tasksService.saveErrorToReport(taskId, errors.join('\n'));
      }

      if (reservationIds.has(reservation[uniqueFieldName])) {
        errorsContent.push(
          formatReportDuplicationReportMessage(
            reservation[uniqueFieldName],
            uniqueFieldName,
            rowNumber,
          ),
        );
      } else {
        reservationIds.add(reservation[uniqueFieldName]);
      }

      if (errorsContent.length) {
        await this.tasksService.saveErrorToReport(
          taskId,
          errorsContent.join('\n'),
        );
        return true;
      }
      return false;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unidentified error';
      await this.tasksService.saveErrorToReport(
        taskId,
        formatReportValidationErrorMessage(errorMessage, rowNumber),
      );
    }
  }

  isRowEmpty<T extends Record<string, any>>(rowJson: T) {
    return Object.values(rowJson).every(
      (rowValue) => rowValue === null || rowValue === undefined,
    );
  }

  async deleteFile(filePath: string) {
    try {
      await fs.promises.unlink(filePath);
      this.logger.log(`File deleted: ${filePath}`);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting file ${filePath}: ${errorMessage}`);
    }
  }

  async failTask(taskId: string, failReason: string) {
    this.logger.warn(failReason);
    await this.tasksService.updateTask(taskId, {
      status: 'FAILED',
      failReason,
      reportPath: this.tasksService.getReportPath(taskId),
    });
  }
}
