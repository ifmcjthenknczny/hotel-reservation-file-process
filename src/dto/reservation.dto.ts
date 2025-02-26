import { IsDate, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReservationStatus {
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

export class ReservationDto {
  @IsString()
  @IsNotEmpty()
  reservationId: string;

  @IsString()
  @IsNotEmpty()
  guestName: string;

  @IsEnum(ReservationStatus)
  status: ReservationStatus;

  @IsDate()
  @Type(() => Date)
  checkInDate: Date;

  @IsDate()
  @Type(() => Date)
  checkOutDate: Date;
}
