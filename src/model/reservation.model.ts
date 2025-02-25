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
