import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { Task } from 'src/tasks/tasks.schema';
import { QueueProcessor } from './queue.processor';
import { QUEUE_NAME } from './queue.service';

@Injectable()
export class QueueWorker implements OnModuleInit, OnModuleDestroy {
  private worker: Worker;

  constructor(private readonly queueProcessor: QueueProcessor) {}

  onModuleInit() {
    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job<Task>) => {
        await this.queueProcessor.handleReservationProcessing(job);
      },
      //   { connection: redisConnection },
    );

    this.worker.on('completed', (job) =>
      console.log(`✅ Job ${job.id} completed`),
    );
    this.worker.on('failed', (job, err) =>
      console.error(`❌ Job ${job?.id} failed: ${err.message}`),
    );

    console.log(`🚀 Worker started for queue: ${QUEUE_NAME}`);
  }

  async onModuleDestroy() {
    await this.worker?.close();
  }
}
