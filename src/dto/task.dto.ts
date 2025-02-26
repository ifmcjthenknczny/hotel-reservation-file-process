import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TASK_STATUSES } from 'src/model/task.model';

export class TaskDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsEnum(TASK_STATUSES)
  status: string;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  errorReport?: string[];
}
