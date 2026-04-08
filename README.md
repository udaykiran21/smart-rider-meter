# Smart Rider Meter (Auto-Rickshaw Fare Estimation)

Production-oriented full-stack fare estimation system using Docker Compose.

## Stack

- **Backend**: Node.js, TypeScript, Express, Prisma
- **Frontend**: React, Vite, TypeScript
- **Database**: PostgreSQL 15
- **Containerization**: Docker, Docker Compose

## Project Structure

```text
root/
  backend/
  frontend/
  docker-compose.yml
```

## Features

### Backend

- Haversine distance module with explicit interface abstraction
- Pricing engine with:
  - distance slabs
  - zone percentage adjustments
  - passenger-based adjustment
  - late-night surcharge
- Ride lifecycle endpoints:
  - `POST /fare/estimate`
  - `POST /ride/start`
  - `POST /ride/end`
- Prisma/PostgreSQL persistence for rides and fare breakdowns
- Startup command waits for database readiness and runs migrations

### Frontend

- Fare estimator form
- Ride start/end controls
- Fare breakdown cards (estimate + final fare)

## Environment Files

- `backend/.env`
- `frontend/.env`
- `.env` (compose project naming)

Backend DB URL is configured for Docker service networking:

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/auto_fare
```

## Run with Docker Compose

> Prerequisite: Docker + Docker Compose plugin installed.

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- PostgreSQL: `localhost:5432`

## API Examples

### Estimate fare

```bash
curl -X POST http://localhost:4000/fare/estimate \
  -H "Content-Type: application/json" \
  -d '{
    "startLatitude": 12.9716,
    "startLongitude": 77.5946,
    "endLatitude": 12.9352,
    "endLongitude": 77.6245,
    "startZone": "STANDARD",
    "endZone": "AIRPORT",
    "passengerCount": 2
  }'
```

### Start ride

```bash
curl -X POST http://localhost:4000/ride/start \
  -H "Content-Type: application/json" \
  -d '{
    "startLatitude": 12.9716,
    "startLongitude": 77.5946,
    "startZone": "STANDARD",
    "passengerCount": 2
  }'
```

### End ride

```bash
curl -X POST http://localhost:4000/ride/end \
  -H "Content-Type: application/json" \
  -d '{
    "rideId": "<ride-id>",
    "endLatitude": 12.9352,
    "endLongitude": 77.6245,
    "endZone": "AIRPORT"
  }'
```

## Notes

- No `npm run dev` is required for normal usage.
- Full system is intended to run directly through Docker Compose.
