import { model, Schema } from 'mongoose';
import { ReservationStatus as ReservationStatusEnum } from 'src/reservation/reservation.dto';
import { Day, DAY_REGEX } from 'src/helpers/validate';

const RESERVATION_STATUSES = ['CANCELED', 'PENDING', 'COMPLETED'] as const;
type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export type Reservation = {
  reservationId: string;
  guestName: string;
  status: ReservationStatus;
  checkInDate: Day;
  checkOutDate: Day;
};

export const ReservationSchema = new Schema({
  reservationId: { type: String, required: true },
  guestName: { type: String, required: true },
  status: {
    type: String,
    enum: RESERVATION_STATUSES,
    required: true,
  },
  checkInDate: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => DAY_REGEX.test(value),
      message: 'check_in_date must be in YYYY-MM-DD format',
    },
  },
  checkOutDate: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => DAY_REGEX.test(value),
      message: 'check_out_date must be in YYYY-MM-DD format',
    },
  },
});

export type PolishReservationStatus =
  | 'oczekująca'
  | 'anulowana'
  | 'zrealizowana';

export const englishStatusMap: Record<
  PolishReservationStatus,
  ReservationStatus
> = {
  oczekująca: ReservationStatusEnum.oczekująca,
  anulowana: ReservationStatusEnum.anulowana,
  zrealizowana: ReservationStatusEnum.zrealizowana,
};

type ReservationFileRow = {
  reservation_id: string;
  guest_name: string;
  status: ReservationStatus;
  check_in_date: Day;
  check_out_date: Day;
};

export const toDbReservation = (
  fileReservation: ReservationFileRow,
): Reservation => {
  return {
    reservationId: fileReservation.reservation_id,
    guestName: fileReservation.guest_name,
    status: fileReservation.status,
    checkInDate: fileReservation.check_in_date,
    checkOutDate: fileReservation.check_out_date,
  };
};

export const ReservationModel = model('Reservation', ReservationSchema);
