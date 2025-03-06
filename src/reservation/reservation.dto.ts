import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PolishReservationStatus,
  ReservationStatus,
  ReservationStatusEnum,
} from 'src/reservation/reservation.schema';
import { Day, DAY_REGEX, IsAfter, Trim } from '~/helpers/decorators';
import { ApiProperty } from '@nestjs/swagger';

// TODO: create property decorator instead
// https://stackoverflow.com/questions/75057430/how-to-list-properties-of-a-nestjs-dto-class
export const RESERVATION_PROPERTIES = [
  'reservation_id',
  'guest_name',
  'status',
  'check_in_date',
  'check_out_date',
];

export class ReservationDto {
  @Trim()
  @IsString({
    message:
      'reservation_id must be a string. Ensure that reservation_id is a valid string.',
  })
  @IsNotEmpty({
    message:
      'reservation_id should not be empty. Please provide a valid reservation ID.',
  })
  @ApiProperty({
    example: '12345',
    description: 'Unique identifier for the reservation',
  })
  reservation_id: string;

  @Trim()
  @IsString({
    message:
      'guest_name must be a string. Please provide a valid name for the guest.',
  })
  @IsNotEmpty({
    message:
      'guest_name should not be empty. Please provide the name of the guest.',
  })
  @ApiProperty({ example: 'John Doe', description: 'Name of the guest' })
  guest_name: string;

  @Trim()
  @IsEnum(ReservationStatusEnum, {
    message: `status should be one of the following valid reservation statuses: ${Object.keys(ReservationStatusEnum).join(', ')}.`,
  })
  @IsNotEmpty({
    message:
      'status should not be empty. Please provide a valid reservation status.',
  })
  @ApiProperty({
    enum: ReservationStatusEnum,
    example: 'oczekująca',
    description: 'Status of the reservation',
  })
  @Transform(({ value }: { value: unknown }): ReservationStatus => {
    if (typeof value !== 'string') {
      throw new Error(
        `Invalid status type: expected string, got ${typeof value}. status should be one of the following valid reservation statuses: ${Object.keys(ReservationStatusEnum).join(', ')}.`,
      );
    }
    const trimmedValue = value.trim() as PolishReservationStatus;
    const englishStatus = ReservationStatusEnum[trimmedValue];
    if (!englishStatus) {
      throw new Error(
        `Invalid status: ${value}. status should be one of the following valid reservation statuses: ${Object.keys(ReservationStatusEnum).join(', ')}.`,
      );
    }
    return englishStatus;
  })
  status: ReservationStatus;

  @Trim()
  @IsString({
    message:
      'check_in_date must be a string. Please provide a valid check_in_date in string format.',
  })
  @IsNotEmpty({
    message:
      'check_in_date should not be empty. Please provide a valid check_in_date.',
  })
  @ApiProperty({
    example: '2025-03-02',
    description: 'Check-in date in YYYY-MM-DD format',
  })
  @Matches(DAY_REGEX, {
    message:
      'check_in_date must be in YYYY-MM-DD format. Please provide the date in this format.',
  })
  check_in_date: Day;

  @Trim()
  @IsString({
    message:
      'check_out_date must be a string. Please provide a valid check_out_date in string format.',
  })
  @IsNotEmpty({
    message:
      'check_out_date should not be empty. Please provide a valid check_out_date.',
  })
  @ApiProperty({
    example: '2024-03-07',
    description: 'Checkout date in YYYY-MM-DD format',
  })
  @Matches(DAY_REGEX, {
    message:
      'check_out_date must be in YYYY-MM-DD format. Please provide the date in this format.',
  })
  @IsAfter('check_in_date', {
    message:
      'check_out_date must be after check_in_date. Please provide a valid check_out_date.',
  })
  check_out_date: Day;
}
