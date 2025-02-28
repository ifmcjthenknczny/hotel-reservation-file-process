// import xlsx from 'xlsx';
// import fs from 'fs';
// import { ReservationModel } from '../model/reservation.model';
// import { ReservationDto } from '../dto/reservation.dto';
// import { plainToInstance } from 'class-transformer';
// import { validate } from 'class-validator';

// export const processFile = async (filePath: string) => {
//   console.log(`📂 Processing file: ${filePath}`);

//   const workbook = xlsx.readFile(filePath);
//   const sheetName = workbook.SheetNames[0];
//   const sheet = workbook.Sheets[sheetName];
//   const rows = xlsx.utils.sheet_to_json(sheet);

//   const errors: string[] = [];

//   for (const [index, row] of rows.entries()) {
//     const rowNumber = index + 2 // counting header, also xlsx starts numbering rows from one
//     const reservation = plainToInstance(ReservationDto, row);
//     const validationErrors = await validate(reservation);

//     if (validationErrors.length > 0) {
//       errors.push(
//         `⛔ Row ${rowNumber}: Validation error for ${JSON.stringify(row)} - ${validationErrors
//           .map((err) =>
//             err.constraints
//               ? Object.values(err.constraints).join(', ')
//               : 'Unknown error',
//           )
//           .join('; ')}`,
//       );

//       continue;
//     }

//     const existingReservation = await ReservationModel.findOne({
//       reservationId: reservation.reservation_id,
//     });

//     if (['CANCELLED', 'COMPLETED'].includes(reservation.status)) {
//       if (existingReservation) {
//         existingReservation.status = reservation.status;
//         await existingReservation.save();
//       }
//       continue;
//     }

//     if (existingReservation) {
//       existingReservation.checkInDate = reservation.check_in_date;
//       existingReservation.checkOutDate = reservation.check_out_date;
//       existingReservation.guestName = reservation.guest_name;
//       existingReservation.status = reservation.status;
//       await existingReservation.save();
//     } else {
//       await ReservationModel.create(reservation);
//     }
//   }

//   if (errors.length > 0) {
//     fs.writeFileSync('error_report.txt', errors.join('\n'));
//     console.log('⚠️ Errors found. See error_report.txt');
//   }

//   console.log(`✅ Processing completed for file: ${filePath}`);
// };
