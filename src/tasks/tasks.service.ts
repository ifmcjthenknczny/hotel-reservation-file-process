import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Queue } from 'bullmq';
import { Task } from './schemas/task.schema';
import uuid from 'uuid';
import { TaskStatus } from 'src/model/task.model.js';
import fs from 'fs'

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private readonly taskModel: Model<Task>,
    private readonly taskQueue: Queue,
  ) {}
  async createTask(file: Express.Multer.File) {
    const taskId: string = uuid.v4();
    const targetDir = path.resolve(__dirname, '../../data/reservations');
    const filePath = path.join(targetDir, `${taskId}.xlsx`);

    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      await fs.promises.rename(file, filePath);

    const task = new this.taskModel({
      taskId,
      filePath,
      status: 'PENDING',
      createdAt: new Date(),
    });

    await task.save();
    await this.taskQueue.add('process-task', { taskId, filePath });

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
