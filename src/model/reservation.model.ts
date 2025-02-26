import { Schema } from 'mongoose';

export const ReservationSchema = new Schema({
  reservationId: { type: String, required: true },
  guestName: { type: String, required: true },
  status: {
    type: { enum: ['CANCELLED', 'PENDING', 'COMPLETED'] },
    required: true,
  },
  checkInDate: { type: Date, required: true },
  checkOutDate: { type: Date, required: true },
});

const RESERVATION_STATUSES = ['CANCELLED', 'PENDING', 'COMPLETED'] as const;

type ReservationStatus = (typeof RESERVATION_STATUSES)[number];
type PolishReservationStatus = 'oczekująca' | 'anulowana' | 'zrealizowana';

const englishStatusMap: Record<PolishReservationStatus, ReservationStatus> = {
  oczekująca: 'PENDING',
  anulowana: 'CANCELLED',
  zrealizowana: 'COMPLETED',
};

type Day = `${number}-${number}-${number}`;

type ReservationFileRow = {
  reservation_id: string;
  guest_name: string;
  status: PolishReservationStatus;
  check_in_date: Day;
  check_out_date: Day;
};
