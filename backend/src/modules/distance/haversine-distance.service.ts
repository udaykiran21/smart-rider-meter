import { IDistanceCalculator } from './distance.interface';

export class HaversineDistanceService implements IDistanceCalculator {
  private static readonly EARTH_RADIUS_KM = 6371;

  calculateDistanceKm(
    startLatitude: number,
    startLongitude: number,
    endLatitude: number,
    endLongitude: number
  ): number {
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

    const dLat = toRadians(endLatitude - startLatitude);
    const dLon = toRadians(endLongitude - startLongitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(startLatitude)) *
        Math.cos(toRadians(endLatitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Number((HaversineDistanceService.EARTH_RADIUS_KM * c).toFixed(3));
  }
}
