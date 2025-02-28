import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAME } from 'src/client/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  imports: [
    ConfigModule,
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    BullModule.registerQueueAsync({
      name: QUEUE_NAME,
      useFactory: (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URI'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class TasksModule {}
