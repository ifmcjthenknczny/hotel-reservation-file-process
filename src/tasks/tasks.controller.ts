import { validate } from 'class-validator';
import {
  BadRequestException,
  Controller,
  Get,
  Header,
  NotFoundException,
  Post,
  Param,
  StreamableFile,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TasksService } from './tasks.service';
import * as fs from 'fs';
import * as path from 'path';
import { VALIDATION_REPORTS_DIRECTORY } from './tasks.service';
import { TaskIdDto, UploadFileDto } from './tasks.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const dto = new UploadFileDto();
    dto.file = file;
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors instanceof BadRequestException) {
      throw errors;
    }
    const task = await this.tasksService.createTask(file);
    return { taskId: task.taskId };
  }

  @Get('status/:taskId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getTaskStatus(@Param() params: TaskIdDto) {
    const task = await this.tasksService.getTask(params.taskId);
    return {
      status: task.status,
    };
  }

  @Get('report/:taskId')
  @UsePipes(new ValidationPipe({ transform: true }))
  @Header('Content-Type', 'text/plain')
  @Header('Content-Disposition', 'attachment; filename="report.txt"')
  async getTaskReport(@Param() params: TaskIdDto) {
    const reportPath = path.join(
      process.cwd(),
      VALIDATION_REPORTS_DIRECTORY,
      `${params.taskId}.txt`,
    );

    try {
      await fs.promises.access(reportPath);
    } catch {
      throw new NotFoundException(
        `Report for Task ID ${params.taskId} not found.`,
      );
    }

    const fileStream = fs.createReadStream(reportPath);
    return new StreamableFile(fileStream);
  }
}
