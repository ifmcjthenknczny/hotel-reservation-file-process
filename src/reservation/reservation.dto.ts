import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { englishStatusMap } from 'src/reservation/reservation.model';
import { Day, DAY_REGEX, IsAfter } from 'src/helpers/validate';

export enum ReservationStatus {
  oczekująca = 'PENDING',
  anulowana = 'CANCELED',
  zrealizowana = 'COMPLETED',
}

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
