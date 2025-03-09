import { forwardRef, Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './tasks.schema';
import { QueueModule } from 'src/queue/queue.module';
import { WebsocketModule } from '~/websocket/websocket.module';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  imports: [
    MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }]),
    forwardRef(() => QueueModule),
    WebsocketModule,
  ],
  exports: [TasksService],
})
export class TasksModule {}
