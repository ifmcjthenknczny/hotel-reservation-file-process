import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PolishReservationStatus,
  ReservationStatus,
  ReservationStatusEnum,
} from 'src/reservation/reservation.schema';
import { Day, DAY_REGEX, IsAfter, Trim } from 'src/helpers/validation';
import { ApiProperty } from '@nestjs/swagger';

export class ReservationDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  @ApiProperty({
    example: '12345',
    description: 'Unique identifier for the reservation',
  })
  reservation_id: string;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @ApiProperty({ example: 'John Doe', description: 'Name of the guest' })
  guest_name: string;

  @IsEnum(ReservationStatusEnum)
  @IsNotEmpty()
  @Trim()
  @ApiProperty({
    enum: ReservationStatusEnum,
    example: 'oczekująca',
    description: 'Status of the reservation',
  })
  @Transform(({ value }: { value: unknown }): ReservationStatus => {
    if (typeof value !== 'string') {
      throw new Error(
        `Invalid status type: expected string, got ${typeof value}`,
      );
    }
    const trimmedValue = value.trim() as PolishReservationStatus;
    const englishStatus = ReservationStatusEnum[trimmedValue];
    if (!englishStatus) {
      throw new Error(`Invalid status: ${value}`);
    }
    return englishStatus;
  })
  status: ReservationStatus;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @ApiProperty({
    example: '2025-03-02',
    description: 'Check-in date in YYYY-MM-DD format',
  })
  @Matches(DAY_REGEX, {
    message: 'check_in_date must be in YYYY-MM-DD format',
  })
  check_in_date: Day;

  @IsString()
  @IsNotEmpty()
  @Trim()
  @ApiProperty({
    example: '2024-03-07',
    description: 'Check-out date in YYYY-MM-DD format',
  })
  @Matches(DAY_REGEX, {
    message: 'check_out_date must be in YYYY-MM-DD format',
  })
  @IsAfter('check_in_date')
  check_out_date: Day;
}
