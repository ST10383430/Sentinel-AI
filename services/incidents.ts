import { supabase } from '../lib/supabase';
import { Incident } from '../lib/types';

export async function persistIncident(incident: Incident): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('incidents').insert({
    id: incident.id,
    category: incident.category,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity: incident.severity,
    status: incident.status,
    created_at: incident.created_at,
  });

  if (error) {
    console.warn('Supabase incident insert failed; local demo state is still active.', error.message);
  }
}
