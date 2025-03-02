import { validate } from 'class-validator';
import {
  BadRequestException,
  Controller,
  Get,
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
import { TaskIdDto, UploadFileDto } from './tasks.dto';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const dto = new UploadFileDto();
    dto.file = file;
    const validationErrors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (validationErrors.length) {
      throw new BadRequestException();
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
  async getTaskReport(@Param() params: TaskIdDto) {
    try {
      const { reportPath } = await this.tasksService.getTask(params.taskId);
      if (!reportPath) {
        throw new NotFoundException();
      }
      await fs.promises.access(reportPath);
      const fileStream = fs.createReadStream(reportPath);
      return new StreamableFile(fileStream, {
        disposition: `attachment; filename="${params.taskId}.txt"`,
        type: 'text/plain',
      });
    } catch {
      throw new NotFoundException(
        `Report for Task ID ${params.taskId} not found.`,
      );
    }
  }
}
