import { useCallback, useEffect, useRef, useState } from 'react';
import { useSentinel } from '../context/SentinelContext';
import { Coords, getCurrentLocation, watchLocation } from '../lib/location';
import { findRelevantIncidents } from '../services/safety';

const IDLE_TEXT = 'Start Safety Mode to monitor recent hotspots within 2 km.';
const ALERT_RADIUS_KM = 2;
const COOLDOWN_MS = 45 * 60 * 1000;

export function useSafetyMode() {
  const { incidents, addNotification } = useSentinel();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(IDLE_TEXT);

  const stopWatching = useRef<null | (() => void)>(null);
  const lastLocation = useRef<Coords | null>(null);
  const lastAlertedAt = useRef(new Map<string, number>());
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  const evaluate = useCallback(
    (location: Coords) => {
      lastLocation.current = location;
      const relevant = findRelevantIncidents(location, incidentsRef.current, ALERT_RADIUS_KM, 7 * 24);
      const nearest = relevant[0];

      if (!nearest) {
        setText(`No reports from the last 7 days found within ${ALERT_RADIUS_KM} km of your current location.`);
        return;
      }

      const count = relevant.length;
      setText(`${count} report${count === 1 ? '' : 's'} from the last 7 days within ${ALERT_RADIUS_KM} km. Nearest: ${nearest.incident.category}, ${nearest.distanceKm.toFixed(1)} km away.`);

      const now = Date.now();
      const fresh = relevant.filter(({ incident }) => {
        const last = lastAlertedAt.current.get(incident.id) ?? 0;
        return now - last >= COOLDOWN_MS;
      });

      if (fresh.length) {
        fresh.forEach(({ incident }) => lastAlertedAt.current.set(incident.id, now));
        const top = fresh[0]!;
        addNotification({
          title: 'Sentinel hotspot alert',
          message: `${fresh.length === 1 ? 'A recent incident' : `${fresh.length} recent incidents`} is within ${ALERT_RADIUS_KM} km. Nearest: ${top.incident.category}, ${top.distanceKm.toFixed(1)} km away.`,
          type: 'safety',
        }, { push: true });
      }
    },
    [addNotification],
  );

  const stop = useCallback(() => {
    stopWatching.current?.();
    stopWatching.current = null;
    lastLocation.current = null;
    setActive(false);
    setText(IDLE_TEXT);
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    try {
      const first = await getCurrentLocation();
      evaluate(first);
      stopWatching.current = await watchLocation(evaluate);
      setActive(true);
    } catch (error) {
      setActive(false);
      setText(`${error instanceof Error ? error.message : 'Location was unavailable.'} You can still review the safety map while location services are unavailable.`);
    } finally {
      setBusy(false);
    }
  }, [evaluate]);

  useEffect(() => {
    if (active && lastLocation.current) evaluate(lastLocation.current);
  }, [incidents, active, evaluate]);

  useEffect(() => () => stopWatching.current?.(), []);

  const showPreviewAlert = useCallback(() => {
    setText('Preview: Sentinel detected a recent hotspot within your 2 km safety radius.');
    addNotification({
      title: 'Sentinel hotspot alert',
      message: 'Preview: recent incident activity is within 2 km of your current journey context.',
      type: 'safety',
    }, { push: true });
  }, [addNotification]);

  return { active, busy, text, start, stop, showPreviewAlert };
}
