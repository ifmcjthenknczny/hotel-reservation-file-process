import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Post,
  Param,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import * as fs from 'fs';
import * as path from 'path';

const REPORTS_DIRECTORY = 'data/reports';

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
    };
  }

  @Get('report/:taskId')
  @Header('Content-Type', 'text/plain')
  @Header('Content-Disposition', 'attachment; filename="report.txt"')
  async getTaskReport(@Param('taskId') taskId: string) {
    const reportPath = path.join(
      process.cwd(),
      REPORTS_DIRECTORY,
      `${taskId}.txt`,
    );

    try {
      await fs.promises.access(reportPath);
    } catch {
      throw new NotFoundException(`Report for Task ID ${taskId} not found.`);
    }

    const fileStream = fs.createReadStream(reportPath);
    return new StreamableFile(fileStream);
  }
}
