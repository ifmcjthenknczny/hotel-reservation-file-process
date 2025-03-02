import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '~/api-key.guard';
import { UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function Protected() {
  return applyDecorators(
    ApiHeader({
      name: 'x-api-key',
      description: 'API key to authorize the request',
      required: true,
    }),
    UseGuards(ApiKeyGuard),
    ApiResponse({
      status: 403,
      description: 'Invalid API key',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                example: 'Forbidden: Invalid API key',
              },
              error: { type: 'string', example: 'Forbidden' },
              statusCode: { type: 'number', example: 403 },
            },
          },
        },
      },
    }),
  );
}
