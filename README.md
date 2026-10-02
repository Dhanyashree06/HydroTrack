# HydroTrack

HydroTrack is a database-free daily water intake tracker built with Flask, HTML, CSS, and JavaScript.

## Features

- Set a custom daily water goal and log preset amounts.
- Track progress, remaining water, and encouraging milestones.
- Review recent drink entries and daily totals for the last seven days.
- See a current hydration streak and unlockable achievements.
- Enable optional browser reminders every 30, 60, or 90 minutes.

Reminders run only while HydroTrack is open in a browser tab. Intake totals and history are held in server memory and are cleared when the server restarts; reminder preferences are stored in that browser.

## Requirements

- Python 3.10 or newer
- pip

## Run locally

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

Open [http://localhost:5000](http://localhost:5000). To use a different port, set the `PORT` environment variable before starting the app:

```powershell
$env:PORT = "8080"
python app.py
```

## Run with Docker

```powershell
docker build -t hydrotrack .
docker run --rm -p 5000:5000 hydrotrack
```

The app listens on `0.0.0.0` and reads its port from `PORT` (default `5000`). Override the container port with `docker run --rm -e PORT=8080 -p 8080:8080 hydrotrack`.

## API

- `GET /api/state` returns today's goal, consumed amount, remaining amount, progress, and message.
- `POST /api/water` accepts `{"amount": 250}` with a positive whole-number amount in milliliters.
- `POST /api/reset` resets today's consumed amount to zero.
- `PUT /api/goal` accepts `{"goal": 2000}` with a positive whole-number goal in milliliters.

The initial version keeps state in server memory. Intake and custom goals reset when the Flask process restarts; running multiple app instances will keep separate state. A shared database can be added later for durable multi-user deployments.