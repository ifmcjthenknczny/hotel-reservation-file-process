import { forwardRef, Module } from '@nestjs/common';
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
    forwardRef(() => TasksModule),
  ],
  providers: [QueueService, QueueWorker],
  exports: [QueueService],
})
export class QueueModule {}
