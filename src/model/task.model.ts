import { Schema } from 'mongoose';

export const TaskSchema = new Schema({
  taskId: { type: String, required: true },
  filePath: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
  },
  createdAt: { type: Date, default: Date.now },
});
