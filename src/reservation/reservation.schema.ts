import { Day, DAY_REGEX } from 'src/helpers/validate';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { ReservationDto } from './reservation.dto';
import { Document } from 'mongoose';

export enum ReservationStatusEnum {
  oczekująca = 'PENDING',
  anulowana = 'CANCELED',
  zrealizowana = 'COMPLETED',
}

export type PolishReservationStatus = keyof typeof ReservationStatusEnum;
export type ReservationStatus = `${ReservationStatusEnum}`;

export type DbReservation = {
  reservationId: string;
  guestName: string;
  status: ReservationStatus;
  checkInDate: Day;
  checkOutDate: Day;
};

@Schema()
export class Reservation extends Document {
  @Prop({ required: true })
  reservationId: string;

  @Prop({ required: true })
  guestName: string;

  @Prop({ required: true, enum: Object.values(ReservationStatusEnum) })
  status: string;

  @Prop({
    required: true,
    validate: {
      validator: (value: string) => DAY_REGEX.test(value),
      message: 'check_in_date must be in YYYY-MM-DD format',
    },
  })
  checkInDate: string;

  @Prop({
    required: true,
    validate: {
      validator: (value: string) => DAY_REGEX.test(value),
      message: 'check_out_date must be in YYYY-MM-DD format',
    },
  })
  checkOutDate: string;
}

export const toDbReservation = (
  fileReservation: ReservationDto,
): DbReservation => {
  return {
    reservationId: fileReservation.reservation_id,
    guestName: fileReservation.guest_name,
    status: fileReservation.status,
    checkInDate: fileReservation.check_in_date,
    checkOutDate: fileReservation.check_out_date,
  };
};

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
