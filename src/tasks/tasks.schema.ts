import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TASK_STATUSES } from 'src/model/task.model';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  taskId: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({
    required: false,
    enum: TASK_STATUSES,
    default: 'PENDING',
  })
  status: string;

  @Prop({ required: true })
  createdAt: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
