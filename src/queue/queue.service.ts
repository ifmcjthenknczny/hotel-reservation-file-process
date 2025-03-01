import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Logger } from 'nestjs-pino';

export const QUEUE_NAME = 'task_queue';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue(QUEUE_NAME) private queue: Queue,
    private readonly logger: Logger,
  ) {}

  async processReservationFile(filePath: string, taskId: string) {
    this.logger.log(`📝 Adding file ${filePath} to the queue...`);
    await this.queue.add(QUEUE_NAME, { filePath, taskId }, { attempts: 3 });
    this.logger.log(`📌 Task ${taskId} added to the queue.`);
  }
}
