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

const DB_INSERT_BATCH_SIZE = 10;

@Processor(QUEUE_NAME)
@Injectable()
export class QueueWorker extends WorkerHost {
  constructor(
    private readonly tasksService: TasksService,
    private readonly reservationService: ReservationService,
  ) {
    super();
  }

  async process(job: Job<Task>): Promise<void> {
    const { filePath, taskId } = job.data;
    const errors: string[] = [];

    try {
      console.log(`📥 Processing file: ${filePath}`);
      await this.tasksService.updateTaskStatus(taskId, 'IN_PROGRESS');

      const buffer = await fs.promises.readFile(filePath);
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const jsonRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        raw: false,
      });
      const validatedJsonRows: ReservationDto[] = [];

      for (const [index, rowContent] of jsonRows.entries()) {
        const rowNumber = index + 2; // numbering starts from one in Excel files, also counting header
        const reservation = plainToInstance(ReservationDto, rowContent);
        const validationErrors = await validate(reservation);

        if (validationErrors.length) {
          errors.push(
            `Błędny wiersz ${rowNumber}: ${JSON.stringify(rowContent)} | ${JSON.stringify(validationErrors)}`,
          );
        }

        if (!errors.length) {
          validatedJsonRows.push(reservation);
        }
      }

      if (errors.length) {
        await this.tasksService.saveValidationReport(taskId, errors);
        await this.tasksService.updateTaskStatus(taskId, 'FAILED');
        console.error(
          `❌ Validation errors occurred while processing ${taskId}`,
        );
        return;
      }

      const dbJobsChunks = chunkify(
        validatedJsonRows.map((reservation) =>
          this.reservationService.processReservation(reservation),
        ),
        DB_INSERT_BATCH_SIZE,
      );

      for (const chunk of dbJobsChunks) {
        await Promise.all(chunk);
      }

      await this.tasksService.updateTaskStatus(taskId, 'COMPLETED');
      console.log(`✅ Task ${taskId} completed.`);
    } catch (error) {
      await this.tasksService.updateTaskStatus(taskId, 'FAILED');
      console.error(`❌ Error while processing ${taskId}:`, error);
    }
  }
}
