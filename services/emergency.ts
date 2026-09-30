import { Linking, Platform } from 'react-native';
import { getCurrentLocation } from '../lib/location';
import { supabase } from '../lib/supabase';
import { EmergencyAlert } from '../lib/types';

// Configured emergency contact for this build. Move this to a secure user
// profile/settings screen before wider deployment.
export const EMERGENCY_CONTACT_NUMBER = '0736598718';

export type EmergencyResult = {
  alert: EmergencyAlert;
  synced: boolean;
  sosMessage: string;
};

export function buildSosMessage(latitude: number, longitude: number) {
  const mapUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
  return `SOS from Sentinel. I may be in danger and need assistance. My current location is ${latitude.toFixed(6)}, ${longitude.toFixed(6)}. Map: ${mapUrl}`;
}

export async function createEmergencyAlert(): Promise<EmergencyResult> {
  const location = await getCurrentLocation();
  const alert: EmergencyAlert = {
    id: `emergency-${Date.now()}`,
    latitude: location.latitude,
    longitude: location.longitude,
    status: 'triggered',
    created_at: new Date().toISOString(),
  };

  let synced = false;
  if (supabase) {
    const { error } = await supabase.from('emergency_alerts').insert(alert);
    if (error) {
      console.warn('Supabase emergency insert failed; keeping the alert on this device.', error.message);
    } else {
      synced = true;
    }
  }

  return { alert, synced, sosMessage: buildSosMessage(alert.latitude, alert.longitude) };
}

/** Opens the phone's SMS composer with a pre-filled SOS. Mobile operating
 * systems require the user to confirm the send; Expo Go cannot silently send
 * SMS in the background. */
export async function openSosMessage(message: string) {
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const url = `sms:${EMERGENCY_CONTACT_NUMBER}${separator}body=${encodeURIComponent(message)}`;
  await Linking.openURL(url);
}

/** Opens the phone dialer for the configured emergency contact. The operating
 * system keeps the final call action under user control. */
export async function openEmergencyCall() {
  const url = `tel:${EMERGENCY_CONTACT_NUMBER}`;
  await Linking.openURL(url);
}
