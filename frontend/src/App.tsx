import { FormEvent, useMemo, useState } from 'react';

type ZoneType = 'STANDARD' | 'AIRPORT' | 'RAILWAY' | 'SUBURBAN';

type Breakdown = {
  baseFare: number;
  distanceCharge: number;
  percentageAdjustment: number;
  adjustmentCharge: number;
  totalFare: number;
  distanceKm: number;
  factors: string[];
};

const apiUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

const defaultTrip = {
  startLatitude: 12.9716,
  startLongitude: 77.5946,
  endLatitude: 12.9352,
  endLongitude: 77.6245,
  startZone: 'STANDARD' as ZoneType,
  endZone: 'STANDARD' as ZoneType,
  passengerCount: 1
};

export default function App() {
  const [trip, setTrip] = useState(defaultTrip);
  const [estimate, setEstimate] = useState<Breakdown | null>(null);
  const [rideId, setRideId] = useState<string>('');
  const [rideEndBreakdown, setRideEndBreakdown] = useState<Breakdown | null>(null);
  const [message, setMessage] = useState<string>('');

  const zoneOptions: ZoneType[] = useMemo(
    () => ['STANDARD', 'AIRPORT', 'RAILWAY', 'SUBURBAN'],
    []
  );

  const estimateFare = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('Calculating estimate...');

    const response = await fetch(`${apiUrl}/fare/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trip)
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage('Failed to estimate fare');
      return;
    }

    setEstimate(data.breakdown);
    setMessage('Estimate ready');
  };

  const startRide = async () => {
    setMessage('Starting ride...');
    const response = await fetch(`${apiUrl}/ride/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLatitude: trip.startLatitude,
        startLongitude: trip.startLongitude,
        startZone: trip.startZone,
        passengerCount: trip.passengerCount
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage('Ride start failed');
      return;
    }

    setRideId(data.rideId);
    setMessage(`Ride started with ID: ${data.rideId}`);
  };

  const endRide = async () => {
    if (!rideId) {
      setMessage('Start a ride before ending it');
      return;
    }

    setMessage('Ending ride...');
    const response = await fetch(`${apiUrl}/ride/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rideId,
        endLatitude: trip.endLatitude,
        endLongitude: trip.endLongitude,
        endZone: trip.endZone
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? 'Ride end failed');
      return;
    }

    setRideEndBreakdown(data.breakdown);
    setMessage(`Ride ended: ${data.status}`);
  };

  return (
    <div className="container">
      <h1>Auto-Rickshaw Fare Estimator</h1>
      <p className="status">{message}</p>

      <form onSubmit={estimateFare} className="card">
        <h2>Fare Estimator</h2>
        <div className="grid">
          {([
            ['Start Latitude', 'startLatitude'],
            ['Start Longitude', 'startLongitude'],
            ['End Latitude', 'endLatitude'],
            ['End Longitude', 'endLongitude']
          ] as const).map(([label, key]) => (
            <label key={key}>
              {label}
              <input
                type="number"
                step="0.0001"
                value={trip[key]}
                onChange={(e) =>
                  setTrip((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                }
              />
            </label>
          ))}

          <label>
            Start Zone
            <select
              value={trip.startZone}
              onChange={(e) =>
                setTrip((prev) => ({ ...prev, startZone: e.target.value as ZoneType }))
              }
            >
              {zoneOptions.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </label>

          <label>
            End Zone
            <select
              value={trip.endZone}
              onChange={(e) =>
                setTrip((prev) => ({ ...prev, endZone: e.target.value as ZoneType }))
              }
            >
              {zoneOptions.map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </label>

          <label>
            Passenger Count
            <input
              type="number"
              min={1}
              max={6}
              value={trip.passengerCount}
              onChange={(e) =>
                setTrip((prev) => ({ ...prev, passengerCount: Number(e.target.value) }))
              }
            />
          </label>
        </div>

        <button type="submit">Estimate Fare</button>
      </form>

      <div className="card">
        <h2>Ride Lifecycle</h2>
        <div className="actions">
          <button onClick={startRide}>Start Ride</button>
          <button onClick={endRide}>End Ride</button>
        </div>
        {rideId && <p>Active Ride ID: {rideId}</p>}
      </div>

      {estimate && <BreakdownCard title="Estimated Fare" breakdown={estimate} />}
      {rideEndBreakdown && <BreakdownCard title="Final Fare" breakdown={rideEndBreakdown} />}
    </div>
  );
}

function BreakdownCard({ title, breakdown }: { title: string; breakdown: Breakdown }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <p>Distance: {breakdown.distanceKm.toFixed(2)} km</p>
      <p>Base Fare: ₹{breakdown.baseFare.toFixed(2)}</p>
      <p>Distance Charge: ₹{breakdown.distanceCharge.toFixed(2)}</p>
      <p>Adjustment Charge: ₹{breakdown.adjustmentCharge.toFixed(2)}</p>
      <p className="total">Total Fare: ₹{breakdown.totalFare.toFixed(2)}</p>
      <ul>
        {breakdown.factors.map((factor) => (
          <li key={factor}>{factor}</li>
        ))}
      </ul>
    </div>
  );
}
