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
import { EXAMPLE_UUID, TaskIdDto, UploadFileDto } from './tasks.dto';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TASK_STATUSES } from './tasks.schema';

@Controller('tasks')
@ApiTags('Tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload reservations file to process' })
  @ApiResponse({
    status: 201,
    description: 'Upload successful, returns created taskId',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', example: EXAMPLE_UUID },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file uploaded' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File upload',
    type: UploadFileDto,
  })
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
  @ApiOperation({ summary: 'Get task status' })
  @ApiResponse({
    status: 200,
    description: 'Returns task status',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'PENDING',
              enum: [...TASK_STATUSES],
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid parameter' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskStatus(@Param() params: TaskIdDto) {
    const task = await this.tasksService.getTask(params.taskId);
    return {
      status: task.status,
    };
  }

  @Get('report/:taskId')
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Download task report' })
  @ApiResponse({
    status: 200,
    description: 'Returns the task report file, automatically downloaded',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          format: 'binary',
          example: 'Problem with row 3: Invalid status: anulowany',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid parameter' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getTaskReport(@Param() params: TaskIdDto) {
    try {
      const { reportPath } = await this.tasksService.getTask(params.taskId);
      if (!reportPath) {
        throw new NotFoundException();
      }
      await fs.promises.access(reportPath);
      const fileStream = fs.createReadStream(reportPath);
      return new StreamableFile(fileStream, {
        disposition: `attachment; filename="${params.taskId}_report.txt"`,
        type: 'text/plain',
      });
    } catch {
      throw new NotFoundException(
        `Report for Task ID ${params.taskId} not found.`,
      );
    }
  }
}
