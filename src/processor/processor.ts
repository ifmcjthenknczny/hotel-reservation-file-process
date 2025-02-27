import xlsx from 'xlsx';
import fs from 'fs';
import { ReservationModel } from '../model/reservation.model';
import { ReservationDto } from '../dto/reservation.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

export const processFile = async (filePath: string) => {
  console.log(`📂 Processing file: ${filePath}`);

  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(sheet);

  const errors: string[] = [];

  for (const row of rows) {
    const reservation = plainToInstance(ReservationDto, row);
    const validationErrors = await validate(reservation);

    if (validationErrors.length > 0) {
      errors.push(
        `⛔ Validation error for: ${JSON.stringify(row)} - ${validationErrors
          .map((err) =>
            err.constraints
              ? Object.values(err.constraints).join(', ')
              : 'Unknown error',
          )
          .join('; ')}`,
      );

      continue;
    }

    const existingReservation = await ReservationModel.findOne({
      reservationId: reservation.reservationId,
    });

    if (['CANCELLED', 'COMPLETED'].includes(reservation.status)) {
      if (existingReservation) {
        existingReservation.status = reservation.status;
        await existingReservation.save();
      }
      continue;
    }

    if (existingReservation) {
      existingReservation.checkInDate = reservation.checkInDate
        .toISOString()
        .split('T')[0];
      existingReservation.checkOutDate = reservation.checkOutDate
        .toISOString()
        .split('T')[0];
      existingReservation.guestName = reservation.guestName;
      existingReservation.status = reservation.status;
      await existingReservation.save();
    } else {
      await ReservationModel.create(reservation);
    }
  }

  if (errors.length > 0) {
    fs.writeFileSync('error_report.txt', errors.join('\n'));
    console.log('⚠️ Errors found. See error_report.txt');
  }

  console.log(`✅ Processing completed for file: ${filePath}`);
};
