import { forwardRef, Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './tasks.schema';
// import { BullModule } from '@nestjs/bullmq';
// import { ConfigService } from '@nestjs/config';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    // BullModule.registerQueueAsync({
    //   name: QUEUE_NAME,
    //   useFactory: (configService: ConfigService) => ({
    //     connection: {
    //       url: configService.get<string>('REDIS_URI'),
    //     },
    //   }),
    //   inject: [ConfigService],
    // }),
    forwardRef(() => QueueModule),
  ],
  exports: [TasksService],
})
export class TasksModule {}
