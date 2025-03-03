import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationSchema } from 'src/reservation/reservation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Reservation', schema: ReservationSchema },
    ]),
  ],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}
