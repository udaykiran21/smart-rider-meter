import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import MapComponent from './MapComponent';

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

const themeOptions = ['mint'] as const;
type ThemeName = (typeof themeOptions)[number];

const zoneDescriptions: Record<ZoneType, string> = {
  STANDARD: 'Everyday city route',
  AIRPORT: 'Premium airport pickup',
  RAILWAY: 'Station transfer zone',
  SUBURBAN: 'Longer suburban stretch'
};

const getInitialTheme = (): ThemeName => {
  const savedTheme = window.localStorage.getItem('theme');

  if (savedTheme && themeOptions.includes(savedTheme as ThemeName)) {
    return savedTheme as ThemeName;
  }

  return 'mint';
};

export default function App() {
  const [trip, setTrip] = useState(defaultTrip);
  const [estimate, setEstimate] = useState<Breakdown | null>(null);
  const [rideId, setRideId] = useState<string>('');
  const [rideEndBreakdown, setRideEndBreakdown] = useState<Breakdown | null>(null);
  const [message, setMessage] = useState<string>('');
  const [theme, setTheme] = useState<ThemeName>(getInitialTheme);

  const [simulating, setSimulating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const simulationRef = useRef<number | null>(null);

  useEffect(() => {
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const zoneOptions: ZoneType[] = useMemo(
    () => ['STANDARD', 'AIRPORT', 'RAILWAY', 'SUBURBAN'],
    []
  );

  const activeBreakdown = rideEndBreakdown ?? estimate;
  const routeDistance = activeBreakdown ? `${activeBreakdown.distanceKm.toFixed(2)} km` : '—';
  const routeTotal = activeBreakdown ? `₹${activeBreakdown.totalFare.toFixed(2)}` : 'Estimate pending';

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

  const startRide = async (overrideSimulating = false) => {
    if (rideId) {
      setMessage('A ride is already active');
      return;
    }

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
    setRideEndBreakdown(null);
    setMessage(`Ride started with ID: ${data.rideId}`);
    return data.rideId;
  };

  const endRide = async (currentRideId?: string) => {
    const idToUse = currentRideId ?? rideId;
    if (!idToUse) {
      setMessage('Start a ride before ending it');
      return;
    }

    setMessage('Ending ride...');
    const response = await fetch(`${apiUrl}/ride/end`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rideId: idToUse,
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
    setRideId('');
  };

  const simulateRide = async () => {
    if (simulating) return;

    if (!estimate) {
        setMessage('Please estimate the fare first to start a simulation');
        return;
    }

    setSimulating(true);
    setCurrentLocation({ lat: trip.startLatitude, lng: trip.startLongitude });

    const newRideId = await startRide(true);
    if (!newRideId) {
        setSimulating(false);
        return;
    }

    const distanceKm = estimate.distanceKm;
    // 1 second per 1 km
    const durationMs = Math.max(1000, distanceKm * 1000);
    const startTime = performance.now();

    const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        const currentLat = trip.startLatitude + (trip.endLatitude - trip.startLatitude) * progress;
        const currentLng = trip.startLongitude + (trip.endLongitude - trip.startLongitude) * progress;

        setCurrentLocation({ lat: currentLat, lng: currentLng });

        if (progress < 1) {
            simulationRef.current = requestAnimationFrame(animate);
        } else {
            endRide(newRideId).then(() => {
                setSimulating(false);
                setCurrentLocation(null);
            });
        }
    };

    simulationRef.current = requestAnimationFrame(animate);
  };

  // Cleanup simulation on unmount
  useEffect(() => {
    return () => {
        if (simulationRef.current) {
            cancelAnimationFrame(simulationRef.current);
        }
    };
  }, []);

  return (
    <div className="app" data-theme={theme}>
      <header className="navbar glass-panel">
        <div className="brand-lockup">
          <span className="logo-mark" aria-hidden="true">🛺</span>
          <div>
            <p className="brand">Smart Rider Meter</p>
            <h1>Fast, transparent auto-rickshaw fares</h1>
          </div>
        </div>
        <nav className="theme-nav" aria-label="Theme switcher">
          {themeOptions.map((name) => (
            <button
              key={name}
              type="button"
              className={theme === name ? 'theme-btn active' : 'theme-btn'}
              onClick={() => setTheme(name)}
              aria-pressed={theme === name}
            >
              {name}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        <section className="hero-grid">
          <div className="hero-card glass-panel animated-card">
            <p className="eyebrow">Live fare planner</p>
            <h2>Plan your route before you hop in.</h2>
            <p className="hero-copy">
              Enter coordinates, choose the pickup and drop zones, then estimate or start a metered ride with the same trip details.
            </p>
            <div className="hero-actions">
              <a href="#fare-form" className="primary-link">Estimate now</a>
              <span className={rideId ? 'ride-pill active' : 'ride-pill'}>{rideId ? 'Ride active' : 'No active ride'}</span>
            </div>
          </div>

          <aside className="summary-card glass-panel animated-card delay-1" aria-label="Fare summary">
            <div>
              <span className="summary-label">Current fare</span>
              <strong>{routeTotal}</strong>
            </div>
            <div className="summary-row">
              <span>Route</span>
              <b>{trip.startZone} → {trip.endZone}</b>
            </div>
            <div className="summary-row">
              <span>Distance</span>
              <b>{routeDistance}</b>
            </div>
            <div className="summary-row">
              <span>Passengers</span>
              <b>{trip.passengerCount}</b>
            </div>
          </aside>
        </section>

        <p className="status" role="status">{message || 'Ready to estimate your next ride fare.'}</p>

        <section className="content-grid">
          <form id="fare-form" onSubmit={estimateFare} className="glass-panel form-card animated-card">
            <div className="section-heading">
              <p className="eyebrow">Trip details</p>
              <h2>Fare Estimator</h2>
            </div>

            <div className="field-grid">
              {([
                ['Start Latitude', 'startLatitude', 'Pickup north/south coordinate'],
                ['Start Longitude', 'startLongitude', 'Pickup east/west coordinate'],
                ['End Latitude', 'endLatitude', 'Drop north/south coordinate'],
                ['End Longitude', 'endLongitude', 'Drop east/west coordinate']
              ] as const).map(([label, key, hint]) => (
                <label className="field" key={key}>
                  <span>{label}</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={trip[key]}
                    onChange={(e) => setTrip((prev) => ({ ...prev, [key]: Number(e.target.value) }))}
                  />
                  <small>{hint}</small>
                </label>
              ))}

              <label className="field">
                <span>Start Zone</span>
                <select
                  value={trip.startZone}
                  onChange={(e) => setTrip((prev) => ({ ...prev, startZone: e.target.value as ZoneType }))}
                >
                  {zoneOptions.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
                <small>{zoneDescriptions[trip.startZone]}</small>
              </label>

              <label className="field">
                <span>End Zone</span>
                <select
                  value={trip.endZone}
                  onChange={(e) => setTrip((prev) => ({ ...prev, endZone: e.target.value as ZoneType }))}
                >
                  {zoneOptions.map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
                <small>{zoneDescriptions[trip.endZone]}</small>
              </label>

              <label className="field">
                <span>Passenger Count</span>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={trip.passengerCount}
                  onChange={(e) => setTrip((prev) => ({ ...prev, passengerCount: Number(e.target.value) }))}
                />
                <small>Supports 1–6 riders</small>
              </label>
            </div>

            <button type="submit" className="primary-btn">Estimate fare</button>

            {estimate && (
                <MapComponent
                    startLat={trip.startLatitude}
                    startLng={trip.startLongitude}
                    endLat={trip.endLatitude}
                    endLng={trip.endLongitude}
                    currentLat={currentLocation?.lat}
                    currentLng={currentLocation?.lng}
                />
            )}
          </form>

          <div className="side-stack">
            <section className="glass-panel ride-card animated-card delay-1">
              <div className="section-heading">
                <p className="eyebrow">Meter controls</p>
                <h2>Ride Lifecycle</h2>
              </div>
              <p>Start the ride from the pickup coordinates, then end it at the drop coordinates to calculate the final fare.</p>
              <div className="actions">
                <button onClick={() => startRide()} className="primary-btn" disabled={!!rideId || simulating}>Start Ride</button>
                <button onClick={() => endRide()} className="secondary-btn" disabled={!rideId || simulating}>End Ride</button>
                <button onClick={simulateRide} className="primary-btn" disabled={!!rideId || simulating || !estimate}>Simulate Ride</button>
              </div>
              {rideId && <p className="active-ride">Active Ride ID: <code>{rideId}</code></p>}
            </section>

            {estimate && <BreakdownCard title="Estimated Fare" breakdown={estimate} />}
            {rideEndBreakdown && <BreakdownCard title="Final Fare" breakdown={rideEndBreakdown} />}
          </div>
        </section>
      </main>
    </div>
  );
}

function BreakdownCard({ title, breakdown }: { title: string; breakdown: Breakdown }) {
  return (
    <section className="glass-panel breakdown-card animated-card delay-2">
      <div className="section-heading">
        <p className="eyebrow">Fare breakdown</p>
        <h2>{title}</h2>
      </div>
      <div className="fare-total">₹{breakdown.totalFare.toFixed(2)}</div>
      <div className="breakdown-grid">
        <FareMetric label="Distance" value={`${breakdown.distanceKm.toFixed(2)} km`} />
        <FareMetric label="Base Fare" value={`₹${breakdown.baseFare.toFixed(2)}`} />
        <FareMetric label="Distance Charge" value={`₹${breakdown.distanceCharge.toFixed(2)}`} />
        <FareMetric label="Adjustment" value={`₹${breakdown.adjustmentCharge.toFixed(2)}`} />
      </div>
      <ul className="factor-list">
        {breakdown.factors.map((factor) => (
          <li key={factor}>{factor}</li>
        ))}
      </ul>
    </section>
  );
}

function FareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="fare-metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
