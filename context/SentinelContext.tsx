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
import { demoIncidents, demoNotifications } from '../data/demoData';
import { pushLocalNotification } from '../lib/notifications';
import { Incident, IncidentCategory, SafetyNotification } from '../lib/types';
import { fetchIncidents, persistIncident, subscribeToIncidents } from '../services/incidents';

type NewIncident = {
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
  image_uri?: string | null;
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

function mergeIncidents(current: Incident[], incoming: Incident[]): Incident[] {
  const known = new Set(current.map((item) => item.id));
  const fresh = incoming.filter((item) => !known.has(item.id));
  return fresh.length ? [...fresh, ...current] : current;
}

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(demoIncidents);
  const [notifications, setNotifications] = useState<SafetyNotification[]>(demoNotifications);
  const knownIds = useRef(new Set(demoIncidents.map((item) => item.id)));

  const addNotification = useCallback((notification: NewNotification, options?: { push?: boolean }) => {
    setNotifications((current) => [
      { ...notification, id: nextId('notification'), created_at: new Date().toISOString() },
      ...current,
    ]);
    // Route alert-capable events through the notification adapter; Expo Go uses the in-app feed.
    if (options?.push ?? notification.type !== 'system') {
      void pushLocalNotification(notification.title, notification.message);
    }
  }, []);

  const track = useCallback((list: Incident[]) => {
    list.forEach((item) => knownIds.current.add(item.id));
  }, []);

  // Load saved reports and listen for reports from other devices (no-ops without Supabase).
  useEffect(() => {
    let cancelled = false;

    fetchIncidents().then((remote) => {
      if (cancelled || !remote.length) return;
      track(remote);
      setIncidents((current) => mergeIncidents(current, remote));
    });

    const unsubscribe = subscribeToIncidents((incident) => {
      if (knownIds.current.has(incident.id)) return; // our own insert echoing back
      track([incident]);
      setIncidents((current) => mergeIncidents(current, [incident]));
      addNotification({
        title: 'New community safety report',
        message: `${incident.category} was reported nearby. The report is currently ${incident.status}.`,
        type: 'incident',
      });
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
          message: `${incident.category} report recorded. It is currently unverified.`,
          type: 'incident',
        },
        { push: true },
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
