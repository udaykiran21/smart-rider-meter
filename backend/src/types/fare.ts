export type ZoneType = 'STANDARD' | 'AIRPORT' | 'RAILWAY' | 'SUBURBAN';

export interface FareEstimateRequest {
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  startZone: ZoneType;
  endZone: ZoneType;
  passengerCount: number;
  rideDateTime?: string;
}

export interface FareBreakdown {
  baseFare: number;
  distanceCharge: number;
  percentageAdjustment: number;
  adjustmentCharge: number;
  totalFare: number;
  distanceKm: number;
  factors: string[];
}
