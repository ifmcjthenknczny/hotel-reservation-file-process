import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as xlsx from 'xlsx';
import { createReadStream } from 'fs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReservationService } from 'src/reservation/reservation.service';
import { TasksService } from 'src/tasks/tasks.service';
import { ReservationDto } from 'src/dto/reservation.dto';
import { Task } from 'src/tasks/tasks.schema';
import { QUEUE_NAME } from './queue.service';
import { Injectable } from '@nestjs/common';

@Processor(QUEUE_NAME)
@Injectable()
export class QueueProcessor {
  constructor(
    private readonly reservationService: ReservationService,
    private readonly tasksService: TasksService,
  ) {}

  async handleReservationProcessing(job: Job<Task>) {
    const { filePath, taskId } = job.data;
    const errors: string[] = [];

    try {
      console.log(`📥 Przetwarzanie pliku: ${filePath}`);

      const stream = createReadStream(filePath);
      const workbook = xlsx.read(stream, { type: 'file' });
      const sheetName = workbook.SheetNames[0];
      const jsonRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        raw: false,
      });

      for (const [index, rowContent] of jsonRows.entries()) {
        const rowNumber = index + 2; // numbering starts from one inn Excel files, also counting header
        const reservation = plainToInstance(ReservationDto, rowContent);
        const validationErrors = await validate(reservation);

        if (validationErrors.length) {
          errors.push(
            `Błędny wiersz ${rowNumber}: ${JSON.stringify(rowContent)} | ${JSON.stringify(errors)}`,
          );
        }
      }

      if (errors.length) {
        await this.tasksService.saveValidationReport(taskId, errors);
        await this.tasksService.updateTaskStatus(taskId, 'FAILED');
        console.error(
          `❌ Wystąpiły błędy walidacji podczas przetwarzania ${taskId}`,
        );
        return;
      }

      for (const row of jsonRows) {
        const reservation = plainToInstance(ReservationDto, row);
        await this.reservationService.processReservation(reservation);
      }

      await this.tasksService.updateTaskStatus(taskId, 'COMPLETED');
      console.log(`✅ Zadanie ${taskId} zakończone.`);
    } catch (error) {
      await this.tasksService.updateTaskStatus(taskId, 'FAILED');
      console.error(`❌ Błąd podczas przetwarzania ${taskId}:`, error);
    }
  }
}
