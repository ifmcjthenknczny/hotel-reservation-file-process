import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation } from '@nestjs/swagger';
import { ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @ApiOperation({ summary: 'Ping the server' })
  @ApiResponse({
    status: 200,
    description: 'Returns server health status',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: 'pong',
          default: 'pong',
        },
      },
    },
  })
  @Get('ping')
  ping() {
    return this.appService.ping();
  }
}
