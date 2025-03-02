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
  @Prop({ required: true, unique: true })
  taskId: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({
    required: true,
    enum: TASK_STATUSES,
    default: 'PENDING',
  })
  status: TaskStatus;

  @Prop({
    required: function (this: Task) {
      return this.status === 'FAILED';
    },
  })
  reportPath?: string;

  @Prop({
    required: function (this: Task) {
      return this.status === 'FAILED';
    },
  })
  failReason?: string;

  @Prop({ required: true, default: Date.now })
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
