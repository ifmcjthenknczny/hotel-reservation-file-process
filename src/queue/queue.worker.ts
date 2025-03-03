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
import { chunkify } from 'src/helpers/array';
import { Logger } from 'nestjs-pino';
import { formatReportErrorMessage } from 'src/helpers/validation';
import { areSetsEqual, mergeHeadersWithValues } from '~/helpers/object';

const DB_PROCESS_BATCH_SIZE = 10;
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
      const validatedJsonRows: ReservationDto[] = [];
      const errors: string[] = [];

      const maxRowNumber =
        xlsx.utils.decode_range(worksheet['!ref'] || '').e.r ?? MAX_XLSX_ROWS;

      if (!maxRowNumber || maxRowNumber === 1) {
        throw new Error(
          'The xlsx file that is being processed does not have any data.',
        );
      }

      for (let rowNumber = 2; rowNumber < maxRowNumber; rowNumber++) {
        const rowIndex = rowNumber - 1;

        const rowJson = this.readJsonRow<ReservationDto>(
          worksheet,
          rowIndex,
          header,
        );

        if (
          Object.values(rowJson).every(
            (rowValue) => rowValue === null || rowValue === undefined,
          )
        ) {
          break;
        }

        await this.validateRow(rowJson, rowNumber, errors, validatedJsonRows);
      }

      if (errors.length) {
        await this.saveValidationErrorReport(taskId, errors);
        return;
      }

      await this.saveReservationToDb(validatedJsonRows);

      await this.tasksService.updateTask(taskId, { status: 'COMPLETED' });
      this.logger.log(`Task ${taskId} completed.`);
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.tasksService.updateTask(taskId, {
        status: 'FAILED',
        failReason: errorMessage,
      });
      this.logger.error(`Error while processing ${taskId}:`, errorMessage);
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
    const buffer = await fs.promises.readFile(filePath);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    return workbook.Sheets[sheetName];
  }

  async validateRow(
    rowContent: ReservationDto,
    rowNumber: number,
    errors: string[],
    validatedJsonRows: ReservationDto[],
  ) {
    try {
      const reservation = plainToInstance(ReservationDto, rowContent);
      const validationErrors = await validate(reservation);

      if (validationErrors.length) {
        errors.push(
          ...validationErrors.map((error) =>
            formatReportErrorMessage(
              Object.values(error.constraints || {}).join(', ') ||
                `Unidentified problem with column ${error.property}`,
              rowNumber,
            ),
          ),
        );
      }

      if (!errors.length) {
        // push rows only if there is a possibility to return them in the future
        validatedJsonRows.push(reservation);
      } else {
        validatedJsonRows = [];
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unidentified error';
      errors.push(formatReportErrorMessage(errorMessage, rowNumber));
    }
  }

  async saveValidationErrorReport(taskId: string, errors: string[]) {
    const reportPath = await this.tasksService.saveErrorReport(taskId, errors);
    await this.tasksService.updateTask(taskId, {
      status: 'FAILED',
      reportPath,
    });
    this.logger.error(`Validation errors occurred while processing ${taskId}`);
  }

  async saveReservationToDb(validatedJsonRows: ReservationDto[]) {
    const dbJobsChunks = chunkify(
      validatedJsonRows.map((reservation) =>
        this.reservationService.processReservation(reservation),
      ),
      DB_PROCESS_BATCH_SIZE,
    );

    for (const chunk of dbJobsChunks) {
      await Promise.all(chunk);
    }
  }
}
