# AttendSync

**Cross-UI Student Attendance Management System** — a teaching portal built with React and an administration dashboard built with Angular, sharing one Express API and MongoDB database.

The workspace root is the project root. It contains the `server/`, `react-teacher/`, `angular-admin/`, `scripts/`, and `report/` directories.

## Prerequisites (Windows 10/11)

- Node.js LTS (includes npm): [https://nodejs.org/en/download](https://nodejs.org/en/download)
- MongoDB Community Server: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- MongoDB Shell (`mongosh`) is optional for the app, but useful for database inspection: [https://www.mongodb.com/try/download/shell](https://www.mongodb.com/try/download/shell)
- Visual Studio Code (optional): [https://code.visualstudio.com/](https://code.visualstudio.com/)

This environment was inspected while building the project: Node.js and npm are available, but neither `mongod`, `mongosh`, nor a MongoDB Windows service was detected. MongoDB has **not** been installed by this project.

### Install MongoDB Community Server

1. Download the Windows x64 MSI from the Community Server link above.
2. Run the MSI, choose **Complete**, and keep **Install MongoD as a Service** selected. The default service name is `MongoDB`.
3. Finish setup. If the service is not running, open PowerShell as Administrator and run `Start-Service MongoDB`.
4. Optional: install MongoDB Shell separately from the `mongosh` link. Open a new PowerShell and verify with `mongosh --version`; verify the server with `Get-Service MongoDB`.
5. MongoDB Community Server normally listens at `mongodb://127.0.0.1:27017`.

If you do not want to install the database locally, configure `MONGODB_URI` in `server\.env` with a MongoDB Atlas connection string. Keep credentials private and never commit `.env`.

## Install and configure

From PowerShell, change to the folder containing this README:

```powershell
Set-Location 'C:\Users\<your-user>\Desktop\AttendSync'
Copy-Item .env.example server\.env
```

Edit `server\.env` if your MongoDB URI differs. Example local values:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/attendsync
CLIENT_ORIGINS=http://localhost:3000,http://localhost:4200
```

Install dependencies with the included setup script:

```powershell
.\scripts\setup.ps1
```

The setup script checks Node/npm and MongoDB, copies `.env.example` only if `server\.env` does not yet exist, and installs each application's npm dependencies. It does not install system software or delete/reset any database. You can instead install manually:

```powershell
npm install --prefix .\server
npm install --prefix .\react-teacher
npm install --prefix .\angular-admin
```

## Start the project

Start the MongoDB Windows service first if it is installed but stopped:

```powershell
Start-Service MongoDB
```

### Start in three terminals

Run each command from the project root in a separate PowerShell terminal:

```powershell
npm --prefix .\server run dev
```

```powershell
npm --prefix .\react-teacher run dev
```

```powershell
npm --prefix .\angular-admin start
```

Open the portals at:

- Teacher Portal (React): [http://localhost:3000](http://localhost:3000)
- Admin Dashboard (Angular): [http://localhost:4200](http://localhost:4200)
- API health: [http://localhost:5000/api/health](http://localhost:5000/api/health)

To run the included separate-window launcher after setup:

```powershell
.\scripts\start-all.ps1
```

The launcher verifies Node, npm, the three dependency folders, `server\.env`, and a detected MongoDB Server/service before opening three PowerShell windows. It does not silently install or start system software.

## Seed fictional demo data

With MongoDB running and `server\.env` configured, run:

```powershell
npm run seed
```

This adds 8 fictional students, 3 subjects/faculty assignments, and sample attendance for the current UTC day. Seeding is repeatable: matching students, subjects, and today's attendance rows are updated, not duplicated. It does not delete database contents.

## API overview

Base URL: `http://localhost:5000/api`. CORS permits `http://localhost:3000` and `http://localhost:4200` by default; configure `CLIENT_ORIGINS` as a comma-separated allowlist.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | API and database readiness |
| GET, POST | `/students` | List or create students |
| GET, POST | `/subjects` | List or create subjects |
| GET | `/attendance?date=YYYY-MM-DD&subjectId=...&studentId=...&status=...` | Filter records; all filters are optional |
| POST | `/attendance/bulk` | Upsert a whole register for a subject/date |
| PATCH | `/attendance/:id` | Change a saved record's status |
| DELETE | `/attendance/:id` | Delete a saved record |
| GET | `/reports/summary` | Dashboard totals and student percentages |

Attendance status is one of `present`, `absent`, or `late`. Dates use `YYYY-MM-DD`. Daily records have a unique `(student, subject, date)` index; bulk saves upsert by that key. Attendance percentage is `(present + late) / total recorded sessions * 100`.

### Bulk request example

```json
{
  "subjectId": "MongoDB subject ObjectId",
  "date": "2026-10-26",
  "records": [
    { "studentId": "MongoDB student ObjectId", "status": "present" },
    { "studentId": "another MongoDB student ObjectId", "status": "late" }
  ]
}
```

Invalid IDs/dates/statuses/required fields return HTTP 400 with a safe JSON `error` message; missing resources return 404; unique conflicts return 409. The server logs unexpected failures and returns a generic 500 response.

## Testing and verification

Run the backend's focused validation and API health tests:

```powershell
npm --prefix .\server test
```

Build both UIs:

```powershell
npm --prefix .\react-teacher run build
npm --prefix .\angular-admin run build
```

### API/manual integration checklist

Run the backend and seed data before checking integration:

1. `GET /api/health` returns HTTP 200 and `{"status":"ok","database":"connected"}`.
2. `GET /api/students` returns at least eight fictional students; `GET /api/subjects` returns three subjects.
3. Mark a complete register in React and submit; confirm it returns a success message and records in MongoDB.
4. Wait for the Angular dashboard polling cycle (up to 3 seconds); confirm the same student, subject, date, and status appear.
5. Change a record in Angular; confirm the updated status appears in React on the next refresh and survives a page reload.
6. Submit the same subject/date/student register again; confirm an upsert updates the record instead of creating a duplicate.
7. Check `GET /api/attendance?status=late`, and date/subject/student filters; confirm only matching rows are returned.
8. Try an invalid status, malformed ID, or impossible date; confirm HTTP 400 and a clear error message.
9. Delete a record with `DELETE /api/attendance/:id`; confirm it no longer appears in either portal.

The implementation run completed the backend test suite (8/8), React production build, and Angular strict-template production build successfully. All three dependency installs reported zero vulnerabilities. MongoDB-backed integration was not run because MongoDB Server is not installed; the API startup check returned `ECONNREFUSED 127.0.0.1:27017`. The seed, cross-UI sync, correction, and persistence checklist remains to be run after MongoDB is installed and started.

## Layout

```text
AttendSync/
├── server/                 Express REST API, Mongoose models, seed and tests
├── react-teacher/          React + Vite teacher attendance portal
├── angular-admin/          Angular standalone administrator dashboard
├── scripts/                Windows PowerShell setup and start helpers
├── report/                 Original project report
├── .env.example            Local API/database configuration template
└── README.md
```

Further project details, team-role placeholders, and demonstration steps are in [report/AttendSync_Mini_Project_Report.md](report/AttendSync_Mini_Project_Report.md).
