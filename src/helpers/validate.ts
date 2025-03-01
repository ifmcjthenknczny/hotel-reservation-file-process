import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const IsAfter = (property: string, message?: string) => {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'IsAfter',
      target: object.constructor,
      propertyName,
      options: {
        message: message ?? `${propertyName} must be after ${property}`,
      },
      constraints: [property],
      validator: {
        validate(value: any, args: ValidationArguments) {
          const relatedValue = (args.object as any)[args.constraints[0]];
          if (!value || !relatedValue) {
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
