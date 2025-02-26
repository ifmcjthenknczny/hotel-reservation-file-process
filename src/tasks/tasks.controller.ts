import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const task = await this.tasksService.createTask(file);
    return { taskId: task.taskId };
  }

  @Get('status/:taskId')
  async getTaskStatus(@Param('taskId') taskId: string) {
    const task = await this.tasksService.getTask(taskId);
    return {
      status: task.status,
      ...(task.errorReport && { errorReport: task.errorReport }),
    };
  }

  @Get('report/:taskId')
  async getTaskReport(@Param('taskId') taskId: string) {
    const { errorReport } = await this.tasksService.getTask(taskId);
    return { errorReport };
  }
}
