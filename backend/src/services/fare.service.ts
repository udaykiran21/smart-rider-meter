import { ZoneType } from '@prisma/client';
import { HaversineDistanceService } from '../modules/distance/haversine-distance.service';
import { PricingEngine } from '../modules/pricing/pricing.engine';
import { FareEstimateRequest } from '../types/fare';

const distanceService = new HaversineDistanceService();
const pricingEngine = new PricingEngine();

export class FareService {
  estimateFare(input: FareEstimateRequest) {
    const distanceKm = distanceService.calculateDistanceKm(
      input.startLatitude,
      input.startLongitude,
      input.endLatitude,
      input.endLongitude
    );

    return pricingEngine.estimateFare(input, distanceKm);
  }

  toPrismaZone(zone: string): ZoneType {
    return zone as ZoneType;
  }
}
