import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TASK_STATUSES } from 'src/tasks/tasks.schema';

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

  @IsDate()
  @IsOptional()
  @Type(() => Date)
  updatedAt: Date;
}
