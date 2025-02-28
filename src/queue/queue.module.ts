import { QueueProcessor } from './queue.processor';
import { Module } from '@nestjs/common';
import { QueueService } from './queue.service';
import { BullModule } from '@nestjs/bullmq';
import { ReservationModule } from 'src/reservation/reservation.module';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAME } from './queue.service';
import { QueueWorker } from './queue.worker';
import { TasksModule } from 'src/tasks/tasks.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QUEUE_NAME,
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URI'),
        },
      }),
      inject: [ConfigService],
    }),
    ReservationModule,
    TasksModule,
  ],
  providers: [QueueService, QueueProcessor, QueueWorker],
  exports: [QueueService, QueueWorker, QueueProcessor],
})
export class QueueModule {}
