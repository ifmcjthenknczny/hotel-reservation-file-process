import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './tasks.schema';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import { QueueService } from 'src/queue/queue.service';
import { Logger } from 'nestjs-pino';
import { TaskDto } from './tasks.dto';
import { WebsocketGateway } from '~/websocket/websocket.gateway';

const RESERVATIONS_DATA_DIRECTORY = 'data/reservations';
const VALIDATION_REPORTS_DIRECTORY = 'data/reports';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<Task>,
    private readonly queueService: QueueService,
    private readonly logger: Logger,
    private readonly websocket: WebsocketGateway,
  ) {}
  async createTask(file: Express.Multer.File) {
    const taskId: string = uuidv4();
    const targetDir = path.join(process.cwd(), RESERVATIONS_DATA_DIRECTORY);
    const filePath = path.join(targetDir, `${taskId}.xlsx`);

    try {
      await fs.promises.access(targetDir);
    } catch {
      await fs.promises.mkdir(targetDir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, file.buffer);

    const task = new this.taskModel({
      taskId,
      filePath,
      status: 'PENDING',
      createdAt: new Date(),
    });
    this.websocket.sendTaskUpdate({
      taskId,
      status: 'PENDING',
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

  async updateTask(
    taskId: string,
    { status, reportPath, failReason }: Partial<TaskDto>,
  ) {
    // note that this function only allows to update values to not-null ones
    await this.taskModel.updateOne(
      { taskId },
      {
        ...(status && { status }),
        ...(reportPath && { reportPath }),
        ...(failReason && { failReason }),
        ...((status || reportPath || failReason) && { updatedAt: new Date() }),
      },
    );
    if (status) {
      this.websocket.sendTaskUpdate({
        taskId,
        status,
        ...(failReason && { message: failReason }),
      });
    }
    return taskId;
  }

  getReportPath(taskId: string) {
    const reportsDir = path.join(process.cwd(), VALIDATION_REPORTS_DIRECTORY);
    const filePath = path.join(reportsDir, `${taskId}.txt`);
    return filePath;
  }

  async saveErrorToReport(taskId: string, errorContent: string) {
    try {
      const reportsDir = path.join(process.cwd(), VALIDATION_REPORTS_DIRECTORY);
      const filePath = path.join(reportsDir, `${taskId}.txt`);

      try {
        await fs.promises.access(reportsDir);
      } catch {
        await fs.promises.mkdir(reportsDir, { recursive: true });
      }

      await fs.promises.appendFile(filePath, `${errorContent}\n`, 'utf-8');

      return filePath;
    } catch (error: any) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error saving to report file for ${taskId}:`,
        errorMessage,
      );
    }
  }
}
