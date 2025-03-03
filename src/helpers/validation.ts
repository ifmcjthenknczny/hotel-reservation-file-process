import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '~/guards/api-key.guard';
import { UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export type Day = `${number}-${number}-${number}`;
export const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const IsAfter = <T extends Record<string, any>>(
  property: keyof T,
  { message }: { message?: string } = {},
) => {
  return (object: T, propertyName: string) => {
    registerDecorator({
      name: 'IsAfter',
      target: object.constructor,
      propertyName,
      options: {
        message:
          message ?? `${propertyName} must be after ${property.toString()}`,
      },
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const relatedValue = (args.object as Record<string, unknown>)[
            args.constraints[0] as string
          ];
          if (typeof value !== 'string' || typeof relatedValue !== 'string') {
            return false;
          }
          return new Date(value) > new Date(relatedValue);
        },
      },
    });
  };
};

export const Trim = <T>() => {
  return Transform(
    ({ value }: { value: T }): T =>
      typeof value === 'string' ? (value.trim() as T) : value,
  );
};

@ValidatorConstraint({ name: 'fileExtension', async: false })
export class FileExtensionValidator implements ValidatorConstraintInterface {
  validate(file: Express.Multer.File, args: ValidationArguments) {
    if (!file) {
      return false;
    }
    const allowedExtensions = args.constraints as string[];
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    return fileExtension ? allowedExtensions.includes(fileExtension) : false;
  }

  defaultMessage(args: ValidationArguments) {
    return `Invalid file type. Only ${args.constraints.join(', ')} files are allowed.`;
  }
}

@ValidatorConstraint({ name: 'fileType', async: false })
export class FileTypeValidator implements ValidatorConstraintInterface {
  validate(file: Express.Multer.File, args: ValidationArguments) {
    if (!file) {
      return false;
    }
    const allowedTypes = args.constraints as string[];

    return Array.isArray(allowedTypes)
      ? allowedTypes.includes(file.mimetype)
      : false;
  }

  defaultMessage(args: ValidationArguments) {
    return `Only files of mimetypes ${args.constraints?.join(', ') || 'specified types'} are allowed.`;
  }
}

@ValidatorConstraint({ name: 'fileNotEmpty', async: false })
export class FileSizeValidator implements ValidatorConstraintInterface {
  validate(file: Express.Multer.File) {
    return !!file && file.size > 0;
  }

  defaultMessage() {
    return 'Uploaded file cannot be empty. Please provide a file with some data.';
  }
}

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

export const formatReportValidationErrorMessage = (
  message: string,
  rowNumber: number,
) => {
  return `Row ${rowNumber}: ${message}`;
};

export const formatReportDuplicationReportMessage = (
  duplicatedValue: string,
  duplicateIndexes: number[],
  fieldName: string,
) => {
  return `Field ${fieldName} with value ${duplicatedValue} must be unique but appears multiple times in the file at rows: ${duplicateIndexes.map((index) => index + 1).join(', ')}. Please ensure that each value in this field is unique before uploading the file.`;
};
