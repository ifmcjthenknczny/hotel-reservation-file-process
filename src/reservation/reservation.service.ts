import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ReservationDto } from 'src/reservation/reservation.dto';
import {
  toDbReservation,
  DbReservation,
} from 'src/reservation/reservation.schema';

@Injectable()
export class ReservationService {
  constructor(
    @InjectModel('Reservation')
    private readonly reservationModel: Model<ReservationDto>,
  ) {}

  async processReservation(reservation: ReservationDto): Promise<void> {
    const { reservationId, status, ...data } = toDbReservation(reservation);

    const existingReservation = await this.findReservation(reservationId);

    const isActiveStatus = !['CANCELED', 'COMPLETED'].includes(status);

    if (existingReservation) {
      await this.updateReservation(reservationId, {
        status,
        ...(isActiveStatus && { data }),
      });
    } else if (isActiveStatus) {
      await this.createReservation({ reservationId, status, ...data });
    }
  }

  private async findReservation(
    reservationId: string,
  ): Promise<DbReservation | null> {
    return this.reservationModel
      .findOne({ reservationId })
      .lean<DbReservation>()
      .exec();
  }

  private async updateReservation(
    reservationId: string,
    updateData: Partial<DbReservation>,
  ): Promise<void> {
    await this.reservationModel
      .updateOne({ reservationId }, { $set: updateData })
      .exec();
  }

  private async createReservation(
    reservationData: Partial<DbReservation>,
  ): Promise<void> {
    const newReservation = new this.reservationModel(reservationData);
    await newReservation.save();
  }
}
