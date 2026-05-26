import { FormEvent, useEffect, useMemo, useState } from 'react';

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

const themeOptions = ['light', 'dark', 'sunset'] as const;
type ThemeName = (typeof themeOptions)[number];

const getInitialTheme = (): ThemeName => {
  const savedTheme = window.localStorage.getItem('theme');

  if (savedTheme && themeOptions.includes(savedTheme as ThemeName)) {
    return savedTheme as ThemeName;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'sunset';
};

export default function App() {
  const [trip, setTrip] = useState(defaultTrip);
  const [estimate, setEstimate] = useState<Breakdown | null>(null);
  const [rideId, setRideId] = useState<string>('');
  const [rideEndBreakdown, setRideEndBreakdown] = useState<Breakdown | null>(null);
  const [message, setMessage] = useState<string>('');
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const zoneOptions: ZoneType[] = useMemo(
    () => ['STANDARD', 'AIRPORT', 'RAILWAY', 'SUBURBAN'],
    []
  );

  const getErrorMessage = (data: unknown, fallback: string) => {
    if (!data || typeof data !== 'object') {
      return fallback;
    }

    const maybeData = data as {
      error?: string;
      errors?: { fieldErrors?: Record<string, string[]> };
    };

    if (maybeData.error) {
      return maybeData.error;
    }

    const fieldErrors = maybeData.errors?.fieldErrors;

    if (fieldErrors) {
      const firstFieldError = Object.values(fieldErrors).flat()[0];
      if (firstFieldError) {
        return firstFieldError;
      }
    }

    return fallback;
  };

  const isValidCoordinate = (value: number) => Number.isFinite(value);

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
      setMessage(getErrorMessage(data, 'Failed to estimate fare'));
      return;
    }

    setEstimate(data.breakdown);
    setMessage('Estimate ready');
  };

  const startRide = async () => {
    if (!isValidCoordinate(trip.startLatitude) || !isValidCoordinate(trip.startLongitude)) {
      setMessage('Enter valid start coordinates');
      return;
    }

    if (!Number.isInteger(trip.passengerCount) || trip.passengerCount < 1 || trip.passengerCount > 6) {
      setMessage('Passenger count must be a whole number between 1 and 6');
      return;
    }

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
      setMessage(getErrorMessage(data, 'Ride start failed'));
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
    <div className="app" data-theme={theme}>
      <header className="navbar card">
        <div>
          <p className="brand">Smart Rider Meter</p>
          <h1>Auto-Rickshaw Fare Estimator</h1>
        </div>
        <nav className="theme-nav" aria-label="Theme switcher">
          {themeOptions.map((name) => (
            <button
              key={name}
              type="button"
              className={theme === name ? 'theme-btn active' : 'theme-btn'}
              onClick={() => setTheme(name)}
            >
              {name}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        <p className="status">{message || 'Ready to estimate your next ride fare.'}</p>

        <form onSubmit={estimateFare} className="card animated-card">
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
                  onChange={(e) => setTrip((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}

            <label>
              Start Zone
              <select
                value={trip.startZone}
                onChange={(e) => setTrip((prev) => ({ ...prev, startZone: e.target.value as ZoneType }))}
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
                onChange={(e) => setTrip((prev) => ({ ...prev, endZone: e.target.value as ZoneType }))}
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
                onChange={(e) => setTrip((prev) => ({ ...prev, passengerCount: Number(e.target.value) }))}
              />
            </label>
          </div>

          <button type="submit" className="primary-btn">Estimate Fare</button>
        </form>

        <div className="card animated-card delay-1">
          <h2>Ride Lifecycle</h2>
          <div className="actions">
            <button onClick={startRide} className="primary-btn">Start Ride</button>
            <button onClick={endRide} className="secondary-btn">End Ride</button>
          </div>
          {rideId && <p>Active Ride ID: {rideId}</p>}
        </div>

        {estimate && <BreakdownCard title="Estimated Fare" breakdown={estimate} />}
        {rideEndBreakdown && <BreakdownCard title="Final Fare" breakdown={rideEndBreakdown} />}
      </main>
    </div>
  );
}

function BreakdownCard({ title, breakdown }: { title: string; breakdown: Breakdown }) {
  return (
    <div className="card animated-card delay-2">
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
