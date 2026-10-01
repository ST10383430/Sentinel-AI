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
    incident_at: row.incident_at ? String(row.incident_at) : String(row.created_at),
    source: 'community',
    image_uri: row.image_uri ? String(row.image_uri) : null,
    video_uri: row.video_uri ? String(row.video_uri) : null,
    location_label: row.location_label ? String(row.location_label) : null,
    visibility: (row.visibility as Incident['visibility']) ?? 'public',
    image_visibility: (row.image_visibility as Incident['image_visibility']) ?? 'private',
    video_visibility: (row.video_visibility as Incident['video_visibility']) ?? 'private',
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
    incident_at: incident.incident_at ?? incident.created_at,
    image_uri: incident.image_uri?.startsWith('http') ? incident.image_uri : null,
    video_uri: incident.video_uri?.startsWith('http') ? incident.video_uri : null,
    location_label: incident.location_label ?? null,
    visibility: incident.visibility ?? 'public',
    image_visibility: incident.image_visibility ?? 'private',
    video_visibility: incident.video_visibility ?? 'private',
  };

  const { error } = await supabase.from('incidents').insert(fullRow);
  if (!error) return true;

  // Never downgrade a private report into a legacy public cloud record. Keep it
  // on-device until the current privacy schema is installed.
  if ((incident.visibility ?? 'public') === 'private') {
    console.warn('Private incident kept on-device until the latest Supabase schema is applied.', error.message);
    return false;
  }

  // Public reports can fall back to the original minimal schema so an older demo
  // database does not stop the app. Media/local labels remain available in session state.
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
