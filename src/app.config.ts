import { IsString, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

export class AppConfig {
  @IsString()
  API_KEY: string;

  @IsString()
  MONGO_URI: string;

  @IsString()
  REDIS_URI: string;
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
