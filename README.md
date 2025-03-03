# Backend Developer Task - Smart Hotel Reservations

This project is a backend application built with NestJS, designed to process hotel reservation files in XLSX format and manage asynchronous tasks in a queue. It utilizes MongoDB to store task and reservation data, processes files asynchronously using BullMQ, and provides an API for interaction.

## Features

- **File Upload and Processing:** Upload an XLSX file containing reservations, process the records, and store the results.

- **Validation:** Validates reservation data before adding it to the database, as well as endpoint input.

- **Error Reporting:** Generates a report for invalid records, available as a .txt file.

- **Task Management:** Supports asynchronous task processing and status updates with BullMQ queue.

Unfortunatelly, streaming XLSX file is [virtually impossible](https://docs.sheetjs.com/docs/solutions/input/#example-readable-streams). Data handling was conducted by reading the entire file into a buffer and then parsing it using `xlsx.read`.

## Setup and Installation

1. Make sure you have already:
- Docker and Docker Compose installed on your machine.
- Yarn installed on your machine.

2. Clone the Repository:
```bash
git clone https://github.com/ifmcjthenknczny/hotel-reservation-file-process
cd hotel-reservation-file-process
```

3. Build and Start the Containers:
Run the following command to start the application with required infractructure (MongoDB and Redis) locally in Docker containers:

```bash
docker-compose up --build -d
```

This will build the project and run it in detached mode. The app will be available at `http://localhost:3000`.

## API

### Swagger

The API is documented and accessible via Swagger at `http://localhost:3000/api`.

### Endpoints overview

- **GET /ping**: Checks if server is available.
<details>
<summary>Click for curl</summary>

```bash
curl --request GET \
  --url http://localhost:3000/ping
```
</details>

- **POST /tasks/upload:** Upload an XLSX file with reservations.
<details>
<summary>Click for curl</summary>

```bash
curl --request POST \
  --url http://localhost:3000/tasks/upload \
  --header 'Content-Type: multipart/form-data' \
  --header 'x-api-key: smarthotel' \
  --form 'file=@<file_path>'
```
</details>

Use it to upload an XLSX file containing reservations. Make sure the file contains valid data and conforms to the expected format, and is connected with `file` key in `multipart/form-data`.

- **GET /tasks/status/:taskId:** Get the status of a task.
<details>
<summary>Click for curl</summary>

```bash
curl --request GET \
  --url http://localhost:3000/tasks/status/<taskId> \
  --header 'x-api-key: smarthotel'
```
</details>

You can check the status of a task, where taskId is the ID returned from the file upload endpoint. It will return the object with status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`).

- **GET /tasks/report/:taskId:** Download the error report in .txt file, if there were invalid records during processing.
<details>
<summary>Click for curl</summary>

```bash
curl --request GET \
  --url http://localhost:3000/tasks/report/<taskId> \
  --header 'x-api-key: smarthotel'
```
</details>

### API Key Authentication

All endpoints are secured and require the x-api-key header for access. The valid API key is:

<details>
<summary>Reveal secret</summary>

```smarthotel```
</details>

Add the API key to your request headers like this:

<details>
<summary>Reveal secret</summary>

```x-api-key: smarthotel```
</details>

## Task Processing Logic

- **Queuing:** After the upload, the task related to the uploaded file is queued in BullMQ for processing.

- **Task Status:** The task status can be queried via `/tasks/status/:taskId` endpoint.

- **XLSX workbook:** Only the first sheet of the XLSX file is processed. Proper structure for data:
![table structure](https://github.com/ifmcjthenknczny/hotel-reservation-file-process/screenshots/xlsx_structure.jpg?raw=true)

- **Validation:** Reservations are only added if file in whole pass validation. Invalid records are logged, and a report is generated.

- **Batch Upsert:** Valid reservations are processed into the database in batches. 

*Note: If an upcoming update for existing reservation has a status of "PENDING", it will be updated as a whole. Otherwise, only the status will be updated.*

- **Error Report:** If errors are encountered during file processing, a .txt report is generated. This can be downloaded from the endpoint `/tasks/report/:taskId`.

## Notes

- **Reservation ID:** The reservation_id can be any string. It's not parsed as a number to keep it flexible.

- **Date Validation:** There is no restriction on the reservation date being in the past due to simplifications for testing purposes.

- **Data Storage:** The error reports and XLSX files are also stored locally, inside the container.

## Conclusion

This application provides a robust backend solution for managing hotel reservations via file uploads, including validation, task queue management, and error reporting. By following the instructions above, you can easily run the application locally using Docker.

## Author

[Maciej Konieczny](https://github.com/ifmcjthenknczny)