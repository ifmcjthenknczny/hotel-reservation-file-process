import { IsEnum, IsNotEmpty, IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { Day } from 'src/model/reservation.model';
import { englishStatusMap } from 'src/model/reservation.model';

export enum ReservationStatus {
  oczekująca = 'PENDING',
  anulowana = 'CANCELLED',
  zrealizowana = 'COMPLETED',
}

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error('Invalid date format');

  return (
    date.toISOString().split('T')[0] +
    ` (${date.toLocaleString('en-US', { weekday: 'long' })})`
  );
};

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
  @Matches(/^\d{4}-\d{2}-\d{2} \([A-Za-z]+\)$/, {
    message: 'checkInDate must be in YYYY-MM-DD (Day) format',
  })
  @Transform(({ value }) => formatDate(value))
  check_in_date: Day;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}-\d{2} \([A-Za-z]+\)$/, {
    message: 'checkInDate must be in YYYY-MM-DD (Day) format',
  })
  @Transform(({ value }) => formatDate(value))
  check_out_date: Day;
}
