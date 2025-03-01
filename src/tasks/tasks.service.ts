import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './tasks.schema';
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus } from 'src/tasks/tasks.schema';
import * as fs from 'fs';
import * as path from 'path';
import { QueueService } from 'src/queue/queue.service';
import { Logger } from 'nestjs-pino';

const RESERVATIONS_DATA_DIRECTORY = 'data/reservations';
export const VALIDATION_REPORTS_DIRECTORY = 'data/reports';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<Task>,
    private readonly queueService: QueueService,
    private readonly logger: Logger,
  ) {}
  async createTask(file: Express.Multer.File) {
    const taskId: string = uuidv4();
    const targetDir = path.join(process.cwd(), RESERVATIONS_DATA_DIRECTORY);
    const filePath = path.join(targetDir, `${taskId}.xlsx`);

    if (!fs.existsSync(targetDir)) {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, file.buffer);

    const task = new this.taskModel({
      taskId,
      filePath,
      status: 'PENDING',
      createdAt: new Date(),
    });

    await task.save();
    await this.queueService.processReservationFile(filePath, taskId);

    return task;
  }

  async getTask(taskId: string): Promise<Task> {
    const task = await this.taskModel.findOne({ taskId }).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found.`);
    }
    return task;
  }

  async updateTaskStatus(taskId: string, newStatus: TaskStatus) {
    await this.taskModel.updateOne({ taskId }, { status: newStatus });
    return taskId;
  }

  async saveValidationReport(taskId: string, validationErrors: string[]) {
    try {
      const reportsDir = path.join(process.cwd(), VALIDATION_REPORTS_DIRECTORY);
      const filePath = path.join(reportsDir, `${taskId}.txt`);
      if (!fs.existsSync(reportsDir)) {
        await fs.promises.mkdir(reportsDir, { recursive: true });
      }
      const content = validationErrors.join('\n');
      await fs.promises.writeFile(filePath, content, 'utf-8');
      this.logger.log(`Report saved: ${filePath}`);
    } catch (error: any) {
      this.logger.error(`Error saving report for ${taskId}:`, error);
    }
  }
}
