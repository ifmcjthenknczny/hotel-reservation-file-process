import {
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Day } from 'src/model/reservation.model';
import { englishStatusMap } from 'src/model/reservation.model';

export enum ReservationStatus {
  oczekująca = 'PENDING',
  anulowana = 'CANCELED',
  zrealizowana = 'COMPLETED',
}

const IsAfter = (property: string, message?: string) => {
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
          if (!value || !relatedValue) return false; // Ensure both values exist
          return new Date(value) > new Date(relatedValue);
        },
      },
    });
  };
};

export const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class ReservationDto {
  @IsString()
  @IsNotEmpty()
  reservation_id: string;

  @IsString()
  @IsNotEmpty()
  guest_name: string;

  @IsEnum(ReservationStatus)
  @IsNotEmpty()
  @Transform(({ value }): ReservationStatus => {
    if (typeof value !== 'string') {
      throw new Error('Invalid status type');
    }
    const mappedStatus = englishStatusMap[value];
    if (!mappedStatus) {
      throw new Error(`Invalid status: ${value}`);
    }
    return mappedStatus;
  })
  status: ReservationStatus;

  @IsString()
  @IsNotEmpty()
  @Matches(DAY_REGEX, {
    message: 'check_in_date must be in YYYY-MM-DD format',
  })
  check_in_date: Day;

  @IsString()
  @IsNotEmpty()
  @Matches(DAY_REGEX, {
    message: 'check_out_date must be in YYYY-MM-DD format',
  })
  @IsAfter('check_in_date', 'check_out_date must be after check_in_date')
  check_out_date: Day;
}
