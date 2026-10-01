import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createNearbyDemoIncidents, demoIncidents, demoNotifications, DEMO_REGION } from '../data/demoData';
import { pushLocalNotification } from '../lib/notifications';
import { getCurrentLocation } from '../lib/location';
import { Incident, IncidentCategory, SafetyNotification, Visibility } from '../lib/types';
import { fetchIncidents, persistIncident, subscribeToIncidents } from '../services/incidents';

type NewIncident = {
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
  image_uri?: string | null;
  video_uri?: string | null;
  location_label?: string | null;
  visibility: Visibility;
  image_visibility: Visibility;
  video_visibility: Visibility;
  incident_at: string;
};

type NewNotification = Omit<SafetyNotification, 'id' | 'created_at'>;

type SentinelContextValue = {
  incidents: Incident[];
  notifications: SafetyNotification[];
  addIncident: (input: NewIncident) => Promise<{ incident: Incident; synced: boolean }>;
  addNotification: (notification: NewNotification, options?: { push?: boolean }) => void;
};

const SentinelContext = createContext<SentinelContextValue | null>(null);

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

function normalizeIncident(incident: Incident): Incident {
  return {
    ...incident,
    visibility: incident.visibility ?? 'public',
    image_visibility: incident.image_visibility ?? 'private',
    video_visibility: incident.video_visibility ?? 'private',
    location_label: incident.location_label ?? null,
    incident_at: incident.incident_at ?? incident.created_at,
  };
}

function mergeIncidents(current: Incident[], incoming: Incident[]): Incident[] {
  const known = new Set(current.map((item) => item.id));
  const fresh = incoming.filter((item) => !known.has(item.id)).map(normalizeIncident);
  return fresh.length ? [...fresh, ...current] : current;
}

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(demoIncidents.map(normalizeIncident));
  const [notifications, setNotifications] = useState<SafetyNotification[]>(demoNotifications);
  const knownIds = useRef(new Set(demoIncidents.map((item) => item.id)));
  const nearbyDemoSeeded = useRef(false);

  const addNotification = useCallback((notification: NewNotification, options?: { push?: boolean }) => {
    setNotifications((current) => [
      { ...notification, id: nextId('notification'), created_at: new Date().toISOString() },
      ...current,
    ]);
    if (options?.push ?? notification.type !== 'system') {
      void pushLocalNotification(notification.title, notification.message);
    }
  }, []);

  const track = useCallback((list: Incident[]) => {
    list.forEach((item) => knownIds.current.add(item.id));
  }, []);


  useEffect(() => {
    let cancelled = false;
    if (nearbyDemoSeeded.current) return () => { cancelled = true; };
    nearbyDemoSeeded.current = true;

    getCurrentLocation()
      .catch(() => ({ latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude }))
      .then((location) => {
        if (cancelled) return;
        const nearby = createNearbyDemoIncidents(location).map(normalizeIncident);
        track(nearby);
        setIncidents((current) => mergeIncidents(current, nearby));
      });

    return () => { cancelled = true; };
  }, [track]);

  useEffect(() => {
    let cancelled = false;

    fetchIncidents().then((remote) => {
      if (cancelled || !remote.length) return;
      track(remote);
      setIncidents((current) => mergeIncidents(current, remote));
    });

    const unsubscribe = subscribeToIncidents((rawIncident) => {
      const incident = normalizeIncident(rawIncident);
      if (knownIds.current.has(incident.id)) return;
      track([incident]);
      setIncidents((current) => mergeIncidents(current, [incident]));
      if (incident.visibility !== 'private') {
        addNotification({
          title: 'New community safety report',
          message: `${incident.category} was reported nearby. The report is currently ${incident.status}.`,
          type: 'incident',
        });
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [addNotification, track]);

  const addIncident = useCallback(
    async (input: NewIncident) => {
      const incident: Incident = {
        id: nextId('incident'),
        ...input,
        severity: input.category === 'Hijacking' || input.category === 'Kidnapping' ? 'high' : 'medium',
        status: 'unverified',
        created_at: new Date().toISOString(),
        source: 'community',
      };

      track([incident]);
      setIncidents((current) => [incident, ...current]);
      addNotification(
        {
          title: 'Report submitted',
          message: input.visibility === 'public'
            ? `${incident.category} report recorded as public. It is currently unverified.`
            : `${incident.category} report recorded privately. It will not appear in the community feed.`,
          type: 'incident',
        },
        { push: false },
      );

      const synced = await persistIncident(incident);
      return { incident, synced };
    },
    [addNotification, track],
  );

  const value = useMemo(
    () => ({ incidents, notifications, addIncident, addNotification }),
    [incidents, notifications, addIncident, addNotification],
  );

  return <SentinelContext.Provider value={value}>{children}</SentinelContext.Provider>;
}

export function useSentinel() {
  const value = useContext(SentinelContext);
  if (!value) throw new Error('useSentinel must be used inside SentinelProvider');
  return value;
}
