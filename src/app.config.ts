import { IsString, IsNumber, validateSync, IsOptional } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class AppConfig {
  @IsString()
  MONGO_URI: string;

  @IsString()
  DATABASE_NAME: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;
}

export function validateConfig(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(AppConfig, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
