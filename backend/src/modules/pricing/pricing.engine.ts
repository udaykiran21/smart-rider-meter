import { FareBreakdown, FareEstimateRequest, ZoneType } from '../../types/fare';

interface DistanceSlab {
  upToKm: number;
  ratePerKm: number;
}

const BASE_FARE = 35;
const DISTANCE_SLABS: DistanceSlab[] = [
  { upToKm: 2, ratePerKm: 18 },
  { upToKm: 8, ratePerKm: 14 },
  { upToKm: Number.POSITIVE_INFINITY, ratePerKm: 12 }
];

const ZONE_ADJUSTMENTS: Record<ZoneType, number> = {
  STANDARD: 0,
  AIRPORT: 0.2,
  RAILWAY: 0.1,
  SUBURBAN: -0.05
};

const PASSENGER_SURCHARGE_PER_EXTRA = 0.07;
const LATE_NIGHT_SURCHARGE = 0.15;

export class PricingEngine {
  estimateFare(input: FareEstimateRequest, distanceKm: number): FareBreakdown {
    const distanceCharge = this.calculateDistanceCharge(distanceKm);
    const factors: string[] = [];

    let percentageAdjustment = 0;

    const zoneAdjustment =
      ZONE_ADJUSTMENTS[input.startZone] + ZONE_ADJUSTMENTS[input.endZone];
    if (zoneAdjustment !== 0) {
      percentageAdjustment += zoneAdjustment;
      factors.push(`Zone adjustment: ${(zoneAdjustment * 100).toFixed(1)}%`);
    }

    if (input.passengerCount > 1) {
      const passengerAdjustment =
        (input.passengerCount - 1) * PASSENGER_SURCHARGE_PER_EXTRA;
      percentageAdjustment += passengerAdjustment;
      factors.push(
        `Passenger adjustment (${input.passengerCount} pax): ${(passengerAdjustment * 100).toFixed(1)}%`
      );
    }

    const rideDate = input.rideDateTime ? new Date(input.rideDateTime) : new Date();
    const hour = rideDate.getHours();
    const isLateNight = hour >= 23 || hour < 5;

    if (isLateNight) {
      percentageAdjustment += LATE_NIGHT_SURCHARGE;
      factors.push(`Late night surcharge: ${(LATE_NIGHT_SURCHARGE * 100).toFixed(1)}%`);
    }

    const subtotal = BASE_FARE + distanceCharge;
    const adjustmentCharge = subtotal * percentageAdjustment;
    const totalFare = subtotal + adjustmentCharge;

    return {
      baseFare: round(BASE_FARE),
      distanceCharge: round(distanceCharge),
      percentageAdjustment: round(percentageAdjustment),
      adjustmentCharge: round(adjustmentCharge),
      totalFare: round(totalFare),
      distanceKm: round(distanceKm),
      factors
    };
  }

  private calculateDistanceCharge(distanceKm: number): number {
    let remaining = distanceKm;
    let previousLimit = 0;
    let charge = 0;

    for (const slab of DISTANCE_SLABS) {
      if (remaining <= 0) {
        break;
      }

      const slabDistance = Math.min(remaining, slab.upToKm - previousLimit);
      charge += slabDistance * slab.ratePerKm;
      remaining -= slabDistance;
      previousLimit = slab.upToKm;
    }

    return charge;
  }
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
