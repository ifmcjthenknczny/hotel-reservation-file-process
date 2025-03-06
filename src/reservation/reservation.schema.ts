import { Day, DAY_REGEX } from '~/helpers/decorators';
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
  createdAt: Date;
  updatedAt?: Date;
};

@Schema({ timestamps: true })
export class Reservation extends Document {
  @Prop({ required: true, unique: true })
  reservationId: string;

  @Prop({ required: true })
  guestName: string;

  @Prop({ required: true, enum: Object.values(ReservationStatusEnum) })
  status: ReservationStatus;

  @Prop({
    required: true,
    validate: {
      validator: (value: string) => DAY_REGEX.test(value),
      message: 'check_in_date must be in YYYY-MM-DD format',
    },
  })
  checkInDate: Day;

  @Prop({
    required: true,
    validate: {
      validator: (value: string) => DAY_REGEX.test(value),
      message: 'check_out_date must be in YYYY-MM-DD format',
    },
  })
  checkOutDate: Day;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt?: Date;
}

export const toDbReservation = (
  fileReservation: ReservationDto,
): Omit<DbReservation, 'createdAt' | 'updatedAt'> => {
  return {
    reservationId: fileReservation.reservation_id,
    guestName: fileReservation.guest_name,
    status: fileReservation.status,
    checkInDate: fileReservation.check_in_date,
    checkOutDate: fileReservation.check_out_date,
  };
};

export const ReservationSchema = SchemaFactory.createForClass(Reservation);
