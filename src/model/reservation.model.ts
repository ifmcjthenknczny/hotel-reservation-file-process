import { model, Schema } from 'mongoose';

const RESERVATION_STATUSES = ['CANCELLED', 'PENDING', 'COMPLETED'] as const;
type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
export type Day = `${number}-${number}-${number}`;

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
      validator: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value),
      message: 'checkInDate must be in YYYY-MM-DD format',
    },
  },
  checkOutDate: {
    type: String,
    required: true,
    validate: {
      validator: (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value),
      message: 'checkInDate must be in YYYY-MM-DD format',
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
  oczekująca: 'PENDING',
  anulowana: 'CANCELLED',
  zrealizowana: 'COMPLETED',
};

type ReservationFileRow = {
  reservation_id: string;
  guest_name: string;
  // status: PolishReservationStatus;
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
    status: englishStatusMap[fileReservation.status],
    checkInDate: fileReservation.check_in_date,
    checkOutDate: fileReservation.check_out_date,
  };
};

export const ReservationModel = model('Reservation', ReservationSchema);
