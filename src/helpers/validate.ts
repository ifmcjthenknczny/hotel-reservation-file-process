import { registerDecorator, ValidationArguments } from 'class-validator';

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
