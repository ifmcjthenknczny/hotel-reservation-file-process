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
  MulterFileTypeValidator,
} from 'src/helpers/validate';

export class TaskDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsEnum(TASK_STATUSES)
  @IsNotEmpty()
  status: TaskStatus;

  @ValidateIf((task: TaskDto) => task.status === 'FAILED')
  @IsString()
  @IsNotEmpty()
  reportPath?: string;

  @ValidateIf((task: TaskDto) => task.status === 'FAILED')
  @IsString()
  @IsNotEmpty()
  failReason?: string;

  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @IsDate()
  @IsOptional()
  updatedAt?: Date;
}

export class UploadFileDto {
  @IsNotEmpty()
  @Validate(FileExtensionValidator, ['xlsx'])
  @Validate(MulterFileTypeValidator, [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ])
  file: Express.Multer.File;
}

export class TaskIdDto {
  @IsUUID()
  taskId: string;
}
