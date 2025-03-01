import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TASK_STATUSES, TaskStatus } from 'src/tasks/tasks.schema';
import { FileExtensionValidator } from 'src/helpers/validate';

export class TaskDto {
  @IsUUID()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsEnum(TASK_STATUSES)
  status: TaskStatus;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  updatedAt: Date;
}

export class UploadFileDto {
  @IsNotEmpty()
  @Validate(FileExtensionValidator, ['xlsx'])
  file: Express.Multer.File;
}

export class TaskIdDto {
  @IsUUID()
  taskId: string;
}
