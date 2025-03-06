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

    try {
      this.logger.log(`Processing file: ${filePath}`);
      await this.tasksService.updateTask(taskId, { status: 'IN_PROGRESS' });

      const worksheet = await this.loadFirstWorksheet(filePath);

      const header = this.readHeaderArray(worksheet);
      const reservationIds: Set<ReservationDto['reservation_id']> = new Set();

      let maxRowNumber =
        xlsx.utils.decode_range(worksheet['!ref'] || '').e.r ?? MAX_XLSX_ROWS;

      if (!maxRowNumber || maxRowNumber === 1) {
        throw new Error(
          'The xlsx file that is being processed does not contain any data.',
        );
      }

      for (let rowNumber = 2; rowNumber < maxRowNumber; rowNumber++) {
        const rowIndex = rowNumber - 1;

        const rowJson = this.readJsonRow<ReservationDto>(
          worksheet,
          rowIndex,
          header,
        );

        if (this.isRowEmpty(rowJson)) {
          maxRowNumber = rowNumber;
          break;
        }

        await this.validateRow(taskId, rowJson, rowNumber, reservationIds);
      }

      if (await this.hadErrors(taskId)) {
        throw new Error(`Task ${taskId} failed, due to validation errors.`);
      }

      for (let rowNumber = 2; rowNumber < maxRowNumber; rowNumber++) {
        // separate loop for memory optimization
        const rowIndex = rowNumber - 1;

        const rowJson = this.readJsonRow<ReservationDto>(
          worksheet,
          rowIndex,
          header,
        );

        await this.reservationService.processReservation(rowJson);
      }

      await this.tasksService.updateTask(taskId, { status: 'COMPLETED' });
      this.logger.log(`Task ${taskId} completed.`);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.tasksService.updateTask(taskId, {
        status: 'FAILED',
        failReason: errorMessage,
      });
      this.logger.error(`Error while processing task ${taskId}:`, errorMessage);
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

  readJsonRow<T>(
    worksheet: xlsx.WorkSheet,
    rowIndex: number,
    header: string[],
  ): T {
    const rowValues = this.readRow(worksheet, rowIndex);
    return mergeHeadersWithValues(header, rowValues) as T;
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

      if (errorsContent) {
        await this.tasksService.saveErrorToReport(
          taskId,
          errorsContent.join('\n'),
        );
      }
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

  async hadErrors(taskId: string) {
    try {
      const filePath = this.tasksService.getReportPath(taskId);
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
