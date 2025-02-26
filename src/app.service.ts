import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getMongoUri(): string {
    return this.configService.get<string>('MONGO_URI')!;
  }
}
