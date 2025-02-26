import { Schema } from 'mongoose';

export const TASK_STATUSES = [
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TaskSchema = new Schema({
  taskId: { type: String, required: true },
  filePath: { type: String, required: true },
  status: {
    type: String,
    enum: TASK_STATUSES,
    default: 'PENDING',
  },
  createdAt: { type: Date, default: Date.now },
});
