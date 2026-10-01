import { supabase } from '../lib/supabase';
import { Incident } from '../lib/types';

function fromRow(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id),
    category: row.category as Incident['category'],
    description: String(row.description),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    severity: (row.severity as Incident['severity']) ?? 'medium',
    status: (row.status as Incident['status']) ?? 'unverified',
    created_at: String(row.created_at),
    source: 'community',
    image_uri: row.image_uri ? String(row.image_uri) : null,
    visibility: (row.visibility as Incident['visibility']) ?? 'public',
    image_visibility: (row.image_visibility as Incident['image_visibility']) ?? 'private',
  };
}

export async function persistIncident(incident: Incident): Promise<boolean> {
  if (!supabase) return false;

  const fullRow = {
    id: incident.id,
    category: incident.category,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity: incident.severity,
    status: incident.status,
    created_at: incident.created_at,
    image_uri: incident.image_uri?.startsWith('http') ? incident.image_uri : null,
    visibility: incident.visibility ?? 'public',
    image_visibility: incident.image_visibility ?? 'private',
  };

  const { error } = await supabase.from('incidents').insert(fullRow);
  if (!error) return true;

  // If the user's existing Supabase table has not yet had the privacy migration,
  // never downgrade a private report into a public cloud record.
  if ((incident.visibility ?? 'public') === 'private') {
    console.warn('Private incident kept on-device until the Supabase privacy migration is applied.', error.message);
    return false;
  }

  // Public reports can fall back to the older schema so the demo remains usable.
  const { error: fallbackError } = await supabase.from('incidents').insert({
    id: incident.id,
    category: incident.category,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity: incident.severity,
    status: incident.status,
    created_at: incident.created_at,
    image_uri: incident.image_uri?.startsWith('http') ? incident.image_uri : null,
  });

  if (fallbackError) {
    console.warn('Supabase incident insert failed; local app state is still active.', fallbackError.message);
    return false;
  }
  return true;
}

export async function fetchIncidents(): Promise<Incident[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.warn('Supabase incident fetch failed; using local data.', error.message);
    return [];
  }
  return (data ?? []).map(fromRow);
}

export function subscribeToIncidents(onInsert: (incident: Incident) => void): () => void {
  const client = supabase;
  if (!client) return () => {};

  const channel = client
    .channel('incidents-feed')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) =>
      onInsert(fromRow(payload.new as Record<string, unknown>)),
    )
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
