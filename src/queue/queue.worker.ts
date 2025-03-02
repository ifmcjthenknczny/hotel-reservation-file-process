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
import { ReservationDto } from 'src/reservation/reservation.dto';
import { chunkify } from 'src/helpers/array';
import { Logger } from 'nestjs-pino';
import { formatReportErrorMessage } from 'src/helpers/validation';

const DB_INSERT_BATCH_SIZE = 10;

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

      const jsonRows = await this.loadFileRows<ReservationDto>(filePath);
      const { validatedJsonRows, errors } = await this.validateFile(jsonRows);

      if (errors.length) {
        await this.saveValidationErrorReport(taskId, errors);
        return;
      }

      await this.insertToDb(validatedJsonRows);

      await this.tasksService.updateTask(taskId, { status: 'COMPLETED' });
      this.logger.log(`Task ${taskId} completed.`);
    } catch (error: any) {
      await this.tasksService.updateTask(taskId, {
        status: 'FAILED',
        failReason: error.message,
      });
      this.logger.error(`Error while processing ${taskId}:`, error.message);
    }
  }

  async loadFileRows<T>(filePath: string): Promise<T[]> {
    const buffer = await fs.promises.readFile(filePath);
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const jsonRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
      raw: false,
    });
    return jsonRows as T[];
  }

  async validateFile(jsonRows: ReservationDto[]) {
    const errors: string[] = [];
    let validatedJsonRows: ReservationDto[] = [];

    for (const [index, rowContent] of jsonRows.entries()) {
      const rowNumber = index + 2; // Excel row starts from 1, header is row 1
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
          continue;
        }

        if (!errors.length) {
          // push rows only if there is a possibility to return them in the future
          validatedJsonRows.push(reservation);
        } else {
          validatedJsonRows = [];
        }
      } catch (error: any) {
        errors.push(
          formatReportErrorMessage(
            error.message || 'Unidentified error',
            rowNumber,
          ),
        );
      }
    }
    return { errors, validatedJsonRows };
  }

  async saveValidationErrorReport(taskId: string, errors: string[]) {
    const reportPath = await this.tasksService.saveErrorReport(taskId, errors);
    await this.tasksService.updateTask(taskId, {
      status: 'FAILED',
      reportPath,
    });
    this.logger.error(`Validation errors occurred while processing ${taskId}`);
  }

  async insertToDb(validatedJsonRows: ReservationDto[]) {
    const dbJobsChunks = chunkify(
      validatedJsonRows.map((reservation) =>
        this.reservationService.processReservation(reservation),
      ),
      DB_INSERT_BATCH_SIZE,
    );

    for (const chunk of dbJobsChunks) {
      await Promise.all(chunk);
    }
  }
}
