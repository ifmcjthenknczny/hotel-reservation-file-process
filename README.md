# Backend Developer Task - Hotel Reservations

This project is a backend application built with NestJS, designed to process hotel reservation files in XLSX format and manage asynchronous tasks in a queue. It utilizes MongoDB to store task and reservation data, processes files asynchronously using BullMQ, and provides an API for interaction.

## Table of contents
* [Features](#features)
* [Setup and Installation](#setup-and-installation)
  + [Environment Variables](#environment-variables)
* [API](#api)
  + [Swagger](#swagger)
  + [Endpoints overview](#endpoints-overview)
  + [API Key Authentication](#api-key-authentication)
  + [WebSocket](#websocket)
* [Task Processing Logic](#task-processing-logic)
* [Notes](#notes)
* [Author](#author)

## Features

- **File Upload and Processing:** Upload an XLSX file containing reservations, process the records, and store the results.

- **Validation:** Validates reservation data before adding it to the database, as well as endpoint input.

- **Error Reporting:** Generates a report for invalid records, available as a .txt file.

- **Task Management:** Supports asynchronous task processing and status updates with BullMQ queue.

- **Memory effective XLSX file reading:** Unfortunatelly, streaming XLSX file is [impossible](https://docs.sheetjs.com/docs/solutions/input/#example-readable-streams). Data handling was conducted by reading the entire file into a buffer and then parsing it using `xlsx.read`, extracting first worksheet and processing rows and cells in a row one by one until it finds first empty row or reaches EOF. 

- **Real-time Task Updates via WebSockets:** Get instant updates on task statuses through a WebSocket connection.

## Setup and Installation

1. Make sure you have already:
- Docker and Docker Compose installed on your machine and running.
- Yarn installed on your machine.

2. Clone the Repository:
```bash
git clone https://github.com/ifmcjthenknczny/hotel-reservation-file-process
cd hotel-reservation-file-process
```

3. Build and Start the Containers:
Run the following command in `hotel-reservation-file-process` directory to start the application with required infractructure (MongoDB and Redis) locally in Docker containers:

```bash
docker-compose up --build -d
```

This will build the project and run it in detached mode. The app will be available at `http://localhost:3000`.

### Environment Variables
The default local environment variables are set in Docker. If needed, you can override them by modifying the .env file using this template:

```
API_KEY=smarthotel
MONGO_URI=mongodb://admin:secret@mongodb:27017/mydatabase?authSource=admin
REDIS_URI=redis://default:mysecretpassword@redis:6379
```

Ensure these values match your development setup before running the application.

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

### WebSocket

The backend supports real-time queue task status updates via WebSockets, it leverages Socket.IO rather than a raw WebSocket implementation for enhanced features like event-based messaging, multiplatform fallback mechanisms, and automatic reconnections. It is available at `ws://localhost:3000`.

The server emits task updates on the `tasks` event. The payload follows this structure:
```json
{
  "taskId": "12345",
  "status": "IN_PROGRESS",
  "message": "Processing started",
  "eventAt": "2025-03-10T12:00:00.000Z"
}
```

To connect to a Websocket using Postman:
1. Open Postman → Click **New Request** → Select **Socket.IO Request**.
2. **Enter the URL**: `ws://localhost:3000`. In **Events** tab enter `tasks` event to track and set the checkbox to enable listening. Click **Connect**.
3. Incoming messages will appear in **Response** subwindow.
4. Click **Disconnect** when finished.

## Task Processing Logic

- **Queuing:** After the upload, the task related to the uploaded file is queued in BullMQ for processing.

- **Task Status:** The task status can be queried via `/tasks/status/:taskId` endpoint.

- **XLSX workbook:** Only the first sheet of the XLSX file is processed. Also, it stops when encounters an empty row and the sheet has to be of proper structure (the program is capable of handling different header order):
![table structure](screenshots/xlsx_structure.jpg)

- **Validation:** Reservations are only added if file in whole pass validation. Invalid records are logged, and a report is generated.

- **Single Upsert:** Reservations are processed into the database one by one, ensuring reduced database and memory load, which is priority.

- **Upsert Logic:** App processes validated reservation data according to the following rules:
  If the reservation has a status of "CANCELED" or "COMPLETED":
    - If it exists in the database → update its status.
    - If it does not exist in the database → do not add it.
  Otherwise → add or update the reservation in the database.

> *Note: If an upcoming update for existing reservation has a status of "PENDING", it will be updated as a whole. Otherwise, only its status will be updated.*

- **Error Report:** If errors are encountered during file processing, a .txt report is generated. It contains row number of validation error occurence, type of error and suggestion for file improvement. It can be downloaded from the endpoint `/tasks/report/:taskId`.

- **Reservation file deletion:** Finally, regardless of task processing result, the reservation file is deleted to free up storage space.

## Notes

- **Reservation ID:** The reservation_id can be any string. It's not parsed as a number to keep it flexible.

- **Date Validation:** There is no restriction on the reservation date being in the past due to simplifications for testing purposes.

- **Data Processing:** Only reservations from fully validated files are stored in the database. Files containing validation errors are logged in a report and excluded from database insertion.

- **Data Storage:** For simplification, error reports and uploaded XLSX files are stored locally, inside the container, under `data/reports` and `data/reservations` directories respectively. In production, they should be stored on some bucket, to avoid possiblity of overflowing the Docker container's storage.

- **Memory Optimization:** The app is optimized for memory efficiency rather than performance. Since streaming the XLSX file is not possible and whole worksheet must be kept in memory, the implementation at least minimizes memory usage and the amount of data stored in variables during processing, including second loop for upserting validated data in database. Also potentially huge `workbook` object is only available in `loadFirstWorksheet` method.

- **Duplication Validation:** Due to the chosen method of duplicate validation (focusing on memory optimization), the first row containing a duplicate value is not marked as a duplicate in the report. Only subsequent occurrences of the same value are considered duplicates.

## Author

[Maciej Konieczny](https://github.com/ifmcjthenknczny)