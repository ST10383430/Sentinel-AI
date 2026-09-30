import { getCurrentLocation } from '../lib/location';
import { supabase } from '../lib/supabase';
import { EmergencyAlert } from '../lib/types';

export async function createTestEmergencyAlert(): Promise<EmergencyAlert> {
  const location = await getCurrentLocation();
  const alert: EmergencyAlert = {
    id: `emergency-${Date.now()}`,
    latitude: location.latitude,
    longitude: location.longitude,
    status: 'test_triggered',
    created_at: new Date().toISOString(),
  };

  if (supabase) {
    const { error } = await supabase.from('emergency_alerts').insert(alert);
    if (error) {
      console.warn('Supabase emergency insert failed; returning local test alert.', error.message);
    }
  }

  return alert;
}
