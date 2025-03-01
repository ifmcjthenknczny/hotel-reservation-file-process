import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export const QUEUE_NAME = 'task_queue';

@Injectable()
export class QueueService {
  constructor(@InjectQueue(QUEUE_NAME) private queue: Queue) {}

  async processReservationFile(filePath: string, taskId: string) {
    console.log(`📝 Adding file ${filePath} to the queue...`);
    await this.queue.add(QUEUE_NAME, { filePath, taskId }, { attempts: 3 });
    console.log(`📌 Task ${taskId} added to the queue.`);
  }
}
