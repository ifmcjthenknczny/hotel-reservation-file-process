import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { Task } from './tasks.schema';
import { v4 as uuidv4 } from 'uuid';
import { TaskStatus } from 'src/model/task.model.js';
import * as fs from 'fs';
import * as path from 'path';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/client/redis';

const RESERVATIONS_DATA_DIRECTORY = 'data/reservations';
const PENDING_DIRECTORY = '/pending';
// const PROCESSED_DIRECTORY = '/processed';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<Task>,
    @InjectQueue(QUEUE_NAME) private readonly taskQueue: Queue,
  ) {}
  async createTask(file: Express.Multer.File) {
    const taskId: string = uuidv4();
    const targetDir = path.join(
      process.cwd(),
      `${RESERVATIONS_DATA_DIRECTORY}${PENDING_DIRECTORY}`,
    );
    const filePath = path.join(targetDir, `${taskId}.xlsx`);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(filePath, file.buffer);

    const task = new this.taskModel({
      taskId,
      filePath,
      status: 'PENDING',
      createdAt: new Date(),
    });

    await task.save();
    await this.taskQueue.add(QUEUE_NAME, { taskId, filePath });
    console.log(task);

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
}
