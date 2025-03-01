import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReservationDto } from 'src/reservation/reservation.dto';
import { toDbReservation } from 'src/reservation/reservation.model';
import { Reservation } from 'src/reservation/reservation.model';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel('Reservation')
    private readonly reservationModel: Model<ReservationDto>,
  ) {}

  async processReservation(reservation: ReservationDto): Promise<void> {
    const { reservationId, status, ...data } = toDbReservation(reservation);

    const existingReservation = await this.findReservation(reservationId);

    if (['CANCELED', 'COMPLETED'].includes(status)) {
      if (existingReservation) {
        await this.updateReservation(reservationId, { status });
      }
    } else if (existingReservation) {
      await this.updateReservation(reservationId, { status, ...data });
    } else {
      await this.createReservation({ reservationId, status, ...data });
    }
  }

  private async findReservation(
    reservationId: string,
  ): Promise<Reservation | null> {
    return this.reservationModel
      .findOne({ reservationId })
      .lean<Reservation>()
      .exec();
  }

  private async updateReservation(
    reservationId: string,
    updateData: Partial<Reservation>,
  ): Promise<void> {
    await this.reservationModel
      .updateOne({ reservationId }, { $set: updateData })
      .exec();
  }

  private async createReservation(
    reservationData: Partial<Reservation>,
  ): Promise<void> {
    const newReservation = new this.reservationModel(reservationData);
    await newReservation.save();
  }
}
