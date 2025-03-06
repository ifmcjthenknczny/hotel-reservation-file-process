import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
  ValidateIf,
} from 'class-validator';
import { TASK_STATUSES, TaskStatus } from 'src/tasks/tasks.schema';
import {
  FileExtensionValidator,
  FileSizeValidator,
  FileTypeValidator,
} from '~/helpers/decorators';
import { ApiProperty } from '@nestjs/swagger';

export const EXAMPLE_UUID = '550e8400-e29b-41d4-a716-446655440000';

export class TaskDto {
  @IsUUID('4')
  @IsNotEmpty()
  @ApiProperty({
    example: EXAMPLE_UUID,
    description: 'Unique UUID identifier of the task',
  })
  taskId: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: `/reservations/${EXAMPLE_UUID}.xlsx`,
    description: 'Path to the uploaded file',
  })
  filePath: string;

  @IsEnum(TASK_STATUSES)
  @IsNotEmpty()
  @ApiProperty({
    enum: TASK_STATUSES,
    example: 'PENDING',
    description: 'Current status of the task',
  })
  status: TaskStatus;

  @ValidateIf((task: TaskDto) => task.status === 'FAILED')
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: `/reports/${EXAMPLE_UUID}_report.txt`,
    description: 'Path to the report file (only if FAILED)',
    required: false,
  })
  reportPath?: string;

  @ApiProperty({
    example: 'Invalid file format',
    description: 'Reason for failure (only if FAILED)',
    required: false,
  })
  @ValidateIf((task: TaskDto) => task.status === 'FAILED')
  @IsString()
  @IsNotEmpty()
  failReason?: string;

  @ApiProperty({
    example: '2025-03-02T07:26:12.194+00:00Z',
    description: 'Task creation timestamp',
  })
  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    example: '2025-03-02T07:26:12.194+00:00',
    description: 'Task last update timestamp',
    required: false,
  })
  @IsDate()
  @IsOptional()
  updatedAt?: Date;
}

export class UploadFileDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Excel file to upload (.xlsx only) with "file" keyname',
  })
  @IsNotEmpty({
    message:
      'file should not be empty. Please provide an .xlsx file to upload.',
  })
  @Validate(FileExtensionValidator, ['xlsx'], {
    message:
      'Invalid file extension. Only .xlsx files are allowed. Please upload a valid Excel file.',
  })
  @Validate(FileSizeValidator)
  @Validate(
    FileTypeValidator,
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    {
      message:
        'Invalid file type. Only .xlsx files with correct MIME type are allowed. Please provide a valid file.',
    },
  )
  file: Express.Multer.File;
}

export class TaskIdDto {
  @ApiProperty({ example: EXAMPLE_UUID, description: 'Task ID' })
  @IsUUID('4', {
    message:
      'taskId should be a valid UUID. Please provide a correct UUID of version 4.',
  })
  taskId: string;
}
