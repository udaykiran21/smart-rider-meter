export interface IDistanceCalculator {
  calculateDistanceKm(
    startLatitude: number,
    startLongitude: number,
    endLatitude: number,
    endLongitude: number
  ): number;
}
