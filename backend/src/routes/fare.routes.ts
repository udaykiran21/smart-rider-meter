import { RideStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { FareService } from '../services/fare.service';

const fareService = new FareService();
const router = Router();

const zoneEnum = z.enum(['STANDARD', 'AIRPORT', 'RAILWAY', 'SUBURBAN']);

const estimateSchema = z.object({
  startLatitude: z.number().min(-90).max(90),
  startLongitude: z.number().min(-180).max(180),
  endLatitude: z.number().min(-90).max(90),
  endLongitude: z.number().min(-180).max(180),
  startZone: zoneEnum,
  endZone: zoneEnum,
  passengerCount: z.number().int().min(1).max(6),
  rideDateTime: z.string().datetime().optional()
});

const startRideSchema = estimateSchema.pick({
  startLatitude: true,
  startLongitude: true,
  startZone: true,
  passengerCount: true
});

const endRideSchema = z.object({
  rideId: z.string().min(1),
  endLatitude: z.number().min(-90).max(90),
  endLongitude: z.number().min(-180).max(180),
  endZone: zoneEnum,
  rideDateTime: z.string().datetime().optional()
});

router.post('/fare/estimate', async (req, res) => {
  const parsed = estimateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const breakdown = fareService.estimateFare(parsed.data);
  return res.json({ breakdown });
});

router.post('/ride/start', async (req, res) => {
  const parsed = startRideSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const ride = await prisma.ride.create({
    data: {
      startLatitude: parsed.data.startLatitude,
      startLongitude: parsed.data.startLongitude,
      startZone: fareService.toPrismaZone(parsed.data.startZone),
      passengerCount: parsed.data.passengerCount
    }
  });

  return res.status(201).json({
    rideId: ride.id,
    startedAt: ride.startedAt
  });
});

router.post('/ride/end', async (req, res) => {
  const parsed = endRideSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const ride = await prisma.ride.findUnique({ where: { id: parsed.data.rideId } });

  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }

  if (ride.status === RideStatus.ENDED) {
    return res.status(409).json({ error: 'Ride already ended' });
  }

  const breakdown = fareService.estimateFare({
    startLatitude: ride.startLatitude,
    startLongitude: ride.startLongitude,
    endLatitude: parsed.data.endLatitude,
    endLongitude: parsed.data.endLongitude,
    startZone: ride.startZone,
    endZone: parsed.data.endZone,
    passengerCount: ride.passengerCount,
    rideDateTime: parsed.data.rideDateTime
  });

  const updatedRide = await prisma.ride.update({
    where: { id: ride.id },
    data: {
      status: RideStatus.ENDED,
      endedAt: new Date(),
      endLatitude: parsed.data.endLatitude,
      endLongitude: parsed.data.endLongitude,
      endZone: fareService.toPrismaZone(parsed.data.endZone),
      distanceKm: breakdown.distanceKm,
      baseFare: breakdown.baseFare,
      distanceCharge: breakdown.distanceCharge,
      adjustmentCharge: breakdown.adjustmentCharge,
      totalFare: breakdown.totalFare,
      breakdown
    }
  });

  return res.json({
    rideId: updatedRide.id,
    status: updatedRide.status,
    breakdown
  });
});

export default router;
