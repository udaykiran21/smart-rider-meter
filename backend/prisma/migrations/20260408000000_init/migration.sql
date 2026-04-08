-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('STARTED', 'ENDED');

-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('STANDARD', 'AIRPORT', 'RAILWAY', 'SUBURBAN');

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "status" "RideStatus" NOT NULL DEFAULT 'STARTED',
    "startLatitude" DOUBLE PRECISION NOT NULL,
    "startLongitude" DOUBLE PRECISION NOT NULL,
    "startZone" "ZoneType" NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "endLatitude" DOUBLE PRECISION,
    "endLongitude" DOUBLE PRECISION,
    "endZone" "ZoneType",
    "distanceKm" DOUBLE PRECISION,
    "baseFare" DOUBLE PRECISION,
    "distanceCharge" DOUBLE PRECISION,
    "adjustmentCharge" DOUBLE PRECISION,
    "totalFare" DOUBLE PRECISION,
    "breakdown" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);
