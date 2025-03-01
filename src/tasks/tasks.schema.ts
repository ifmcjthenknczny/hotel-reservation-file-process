import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

@Schema({ timestamps: true })
export class Task extends Document {
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
