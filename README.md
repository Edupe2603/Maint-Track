# MaintTrack

MaintTrack is a maintenance and asset management application for tracking equipment, reporting maintenance issues, and coordinating repair work.

## Features

- Dashboard with asset and maintenance metrics, issue filters, and issue details.
- Asset catalog with asset creation and status updates.
- Maintenance issue reporting, diagnosis updates, and technician notes.
- JWT authentication with admin, technician, and viewer roles.
- Admin-only user creation with role assignment.
- SQLite database by default.
- Demo profiles for exploring the frontend with mock data.

## Technology

- **Frontend:** React, React Router, and Vite
- **Backend:** Python, Flask, Flask-SQLAlchemy, Flask-JWT-Extended, and Flask-Cors
- **Database:** SQLite by default; other SQLAlchemy database URLs can be configured.

## Requirements

- Python 3.10 or newer
- Node.js 20 or newer, including npm

## Run locally

Open two terminals from the project root.

For a fresh checkout, create the local environment file from the template:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set `JWT_SECRET_KEY` to a long random value. The `.env` file is excluded from Git; never commit real credentials or secrets.

### Backend

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python seed.py
python app.py
```

The API runs at `http://localhost:5000`. Check that it is available at `http://localhost:5000/api/health`.

If PowerShell prevents environment activation, allow scripts for the current terminal session and activate again:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

### Frontend

In a second terminal:

```powershell
cd frontend\src\context
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://127.0.0.1:5173`.

Build the frontend for production with:

```powershell
npm run build
```

## Demo accounts

Running `python seed.py` creates these backend accounts. The password for each account is `Password123!`.

| Role | Email |
| --- | --- |
| Admin | `admin@mainttrack.local` |
| Technician | `tech@mainttrack.local` |
| Viewer | `viewer@mainttrack.local` |

The login page also provides mock demo profiles. They use local mock data and are not authenticated backend accounts; use a seeded account to test API-backed features such as creating users.

## Roles and permissions

| Capability | Admin | Technician | Viewer |
| --- | :---: | :---: | :---: |
| View assets and maintenance issues | Yes | Yes | Yes |
| Report a maintenance issue | Yes | Yes | Yes |
| Add assets | Yes | Yes | No |
| Update asset status | Yes | Yes | No |
| Update issue diagnosis or status | Yes | Yes | No |
| Add diagnostic notes | Yes | Yes | No |
| Create users and assign roles | Yes | No | No |

User creation is available to authenticated admins only. New accounts can be assigned the `admin`, `technician`, or `viewer` role.

## Configuration

The backend loads these environment variables from the root `.env` file using `python-dotenv`. Variables already set in the process take precedence:

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///mainttrack.db` | SQLAlchemy database connection URL |
| `JWT_SECRET_KEY` | `dev-secret-change-in-production` | Secret used to sign access tokens |
| `CORS_ORIGINS` | `*` | Allowed origin(s) for `/api/*` requests |

You can also override backend variables in PowerShell before starting Flask:

```powershell
$env:JWT_SECRET_KEY = "replace-with-a-long-random-secret"
$env:CORS_ORIGINS = "http://127.0.0.1:5173"
python app.py
```

The frontend API base URL defaults to `http://localhost:5000/api`. To change it, create a `.env` file in `frontend\src\context`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Restart Vite after changing frontend environment variables. Do not use the development JWT secret or allow all CORS origins in production.

## API overview

All API routes are under `/api`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Check API availability |
| `POST` | `/auth/login` | Log in and receive an access token |
| `POST` | `/auth/register` | Create a user (admin access token required) |
| `GET` | `/auth/me` | Get the authenticated user |
| `GET`, `POST` | `/assets` | List or create assets |
| `PATCH` | `/assets/{asset_id}` | Update an asset |
| `GET`, `POST` | `/logs` | List or report maintenance issues |
| `GET`, `PATCH` | `/logs/{log_id}` | Get or update an issue |
| `POST` | `/logs/{log_id}/notes` | Add a diagnostic note |

Protected endpoints require an access token in the `Authorization: Bearer <token>` header. Asset creation and updates, issue updates, and diagnostic notes require an admin or technician token. User creation requires an admin token.

## Project layout

```text
backend/
  app.py
  config.py
  models.py
  requirements.txt
  routes/
  seed.py
frontend/
  src/
    context/
      App.jsx
      main.jsx
      styles.css
      pages/
      services/
      data/
```
