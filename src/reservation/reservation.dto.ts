import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import {
  PolishReservationStatus,
  ReservationStatus,
  ReservationStatusEnum,
} from 'src/reservation/reservation.schema';
import { Day, DAY_REGEX, IsAfter } from 'src/helpers/validation';

export class ReservationDto {
  @IsString()
  @IsNotEmpty()
  reservation_id: string;

  @IsString()
  @IsNotEmpty()
  guest_name: string;

  @IsEnum(ReservationStatusEnum)
  @IsNotEmpty()
  @Transform(({ value }): PolishReservationStatus => {
    const englishStatus = ReservationStatusEnum[value.trim()];
    if (!englishStatus) {
      throw new Error(`Invalid status: ${value}`);
    }
    return englishStatus;
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
  @IsAfter('check_in_date')
  check_out_date: Day;
}
