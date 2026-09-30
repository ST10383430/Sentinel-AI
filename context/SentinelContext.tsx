import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { demoIncidents, demoNotifications } from '../data/demoData';
import { Incident, IncidentCategory, SafetyNotification } from '../lib/types';
import { persistIncident } from '../services/incidents';

type NewIncident = {
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
};

type SentinelContextValue = {
  incidents: Incident[];
  notifications: SafetyNotification[];
  addIncident: (input: NewIncident) => Promise<Incident>;
  addNotification: (notification: Omit<SafetyNotification, 'id' | 'created_at'>) => void;
};

const SentinelContext = createContext<SentinelContextValue | null>(null);

export function SentinelProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>(demoIncidents);
  const [notifications, setNotifications] = useState<SafetyNotification[]>(demoNotifications);

  async function addIncident(input: NewIncident) {
    const incident: Incident = {
      id: `incident-${Date.now()}`,
      ...input,
      severity: input.category === 'Hijacking' || input.category === 'Kidnapping' ? 'high' : 'medium',
      status: 'unverified',
      created_at: new Date().toISOString(),
      source: 'community',
    };

    setIncidents((current) => [incident, ...current]);
    setNotifications((current) => [
      {
        id: `notification-${Date.now()}`,
        title: 'New community safety report',
        message: `${incident.category} was reported. The report is currently unverified.`,
        type: 'incident',
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);

    await persistIncident(incident);
    return incident;
  }

  function addNotification(notification: Omit<SafetyNotification, 'id' | 'created_at'>) {
    setNotifications((current) => [
      { ...notification, id: `notification-${Date.now()}`, created_at: new Date().toISOString() },
      ...current,
    ]);
  }

  const value = useMemo(
    () => ({ incidents, notifications, addIncident, addNotification }),
    [incidents, notifications],
  );

  return <SentinelContext.Provider value={value}>{children}</SentinelContext.Provider>;
}

export function useSentinel() {
  const value = useContext(SentinelContext);
  if (!value) throw new Error('useSentinel must be used inside SentinelProvider');
  return value;
}
