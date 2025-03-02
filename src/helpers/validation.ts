import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Transform } from 'class-transformer';

export const IsAfter = <T extends Record<string, any>>(
  property: keyof T,
  message?: string,
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

export type Day = `${number}-${number}-${number}`;
export const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
export class MulterFileTypeValidator implements ValidatorConstraintInterface {
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

export const formatReportErrorMessage = (
  message: string,
  rowNumber: number,
) => {
  return `Row ${rowNumber}: ${message}`;
};

export const Trim = <T>() => {
  return Transform(
    ({ value }: { value: T }): T =>
      typeof value === 'string' ? (value.trim() as T) : value,
  );
};
