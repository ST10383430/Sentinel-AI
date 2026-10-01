import { CommunityPost, Incident, SafetyNotification } from '../lib/types';

export const DEMO_REGION = {
  latitude: -26.2041,
  longitude: 28.0473,
  latitudeDelta: 0.055,
  longitudeDelta: 0.055,
};

const agoMinutes = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const agoDays = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();


type Coords = { latitude: number; longitude: number };

function offsetCoordinate(origin: Coords, distanceKm: number, bearingDegrees: number): Coords {
  const earthRadiusKm = 6371;
  const bearing = bearingDegrees * Math.PI / 180;
  const lat1 = origin.latitude * Math.PI / 180;
  const lon1 = origin.longitude * Math.PI / 180;
  const angularDistance = distanceKm / earthRadiusKm;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
  );

  return { latitude: lat2 * 180 / Math.PI, longitude: lon2 * 180 / Math.PI };
}

/**
 * Session-only demo records placed around the device at startup.
 * All three are within 1 km of the current location and close enough together
 * to demonstrate Sentinel's red 3+ reports / 7 days hotspot state.
 */
export function createNearbyDemoIncidents(origin: Coords): Incident[] {
  const samples = [
    { id: 'demo-nearby-1', distanceKm: 0.28, bearing: 35, category: 'Robbery' as const, minutesAgo: 25, description: 'Recent robbery report near your current area.' },
    { id: 'demo-nearby-2', distanceKm: 0.46, bearing: 70, category: 'Hijacking' as const, minutesAgo: 75, description: 'Recent hijacking report in the surrounding area.' },
    { id: 'demo-nearby-3', distanceKm: 0.62, bearing: 52, category: 'Suspicious activity' as const, minutesAgo: 165, description: 'Repeated suspicious activity reported nearby.' },
  ];

  return samples.map((sample) => {
    const point = offsetCoordinate(origin, sample.distanceKm, sample.bearing);
    const incidentAt = agoMinutes(sample.minutesAgo);
    return {
      id: sample.id,
      category: sample.category,
      description: sample.description,
      latitude: point.latitude,
      longitude: point.longitude,
      severity: sample.category === 'Hijacking' ? 'high' : 'medium',
      status: sample.id === 'demo-nearby-3' ? 'corroborated' : 'unverified',
      incident_at: incidentAt,
      created_at: incidentAt,
      source: 'demo',
      visibility: 'public',
      image_visibility: 'private',
    };
  });
}

/**
 * Preloaded public sample records are intentionally arranged into three frequency bands:
 * - red cluster: 3+ reports in the last 7 days
 * - amber cluster: 2 reports in the last 7 days
 * - green area: 1 report in the last 7 days
 * This lets the map key and Safety Mode be demonstrated immediately.
 */
export const demoIncidents: Incident[] = [
  {
    id: 'demo-red-1', category: 'Hijacking',
    description: 'Recent community hijacking report near a major intersection.',
    latitude: -26.2041, longitude: 28.0473, severity: 'high', status: 'corroborated',
    created_at: agoMinutes(35), source: 'demo', visibility: 'public', image_visibility: 'private',
    image_uri: 'https://placehold.co/900x560/png?text=Sample+Evidence',
  },
  {
    id: 'demo-red-2', category: 'Robbery',
    description: 'Phone robbery reported within the same local safety area.',
    latitude: -26.2028, longitude: 28.0491, severity: 'high', status: 'unverified',
    created_at: agoMinutes(95), source: 'demo', visibility: 'public', image_visibility: 'public',
    image_uri: 'https://placehold.co/900x560/png?text=Public+Sample+Photo',
  },
  {
    id: 'demo-red-3', category: 'Suspicious activity',
    description: 'Repeated suspicious activity reported by community members.',
    latitude: -26.2057, longitude: 28.0459, severity: 'medium', status: 'corroborated',
    created_at: agoDays(2), source: 'demo', visibility: 'public', image_visibility: 'public',
  },
  {
    id: 'demo-orange-1', category: 'Robbery',
    description: 'Robbery report near a transport corridor.',
    latitude: -26.2130, longitude: 28.0570, severity: 'medium', status: 'unverified',
    created_at: agoDays(1), source: 'demo', visibility: 'public', image_visibility: 'private',
  },
  {
    id: 'demo-orange-2', category: 'Assault',
    description: 'Assault reported in the same general corridor.',
    latitude: -26.2143, longitude: 28.0583, severity: 'medium', status: 'corroborated',
    created_at: agoDays(4), source: 'demo', visibility: 'public', image_visibility: 'private',
  },
  {
    id: 'demo-green-1', category: 'Kidnapping',
    description: 'Single recent incident report in this area.',
    latitude: -26.1950, longitude: 28.0330, severity: 'high', status: 'official',
    created_at: agoDays(3), source: 'demo', visibility: 'public', image_visibility: 'private',
  },
  {
    id: 'demo-old-1', category: 'Other',
    description: 'Older record retained for historical context.',
    latitude: -26.2200, longitude: 28.0410, severity: 'low', status: 'official',
    created_at: agoDays(12), source: 'demo', visibility: 'public', image_visibility: 'private',
  },
];

export const demoNotifications: SafetyNotification[] = [
  {
    id: 'notice-1',
    title: 'Safety context ready',
    message: 'Start Safety Mode to receive a Sentinel alert when a recent hotspot is within 2 km.',
    type: 'safety',
    created_at: agoMinutes(15),
  },
];

export const communityPosts: CommunityPost[] = [
  {
    id: 'post-1',
    title: 'Community safety notice',
    body: 'Use well-lit routes, remain aware of your surroundings, and use verified emergency channels when immediate assistance is required.',
    tag: 'Safety',
    created_at: agoMinutes(60),
  },
  {
    id: 'post-2',
    title: 'Official updates',
    body: 'Official police or municipal announcements are clearly labelled and kept separate from community observations.',
    tag: 'Official',
    created_at: agoDays(1),
  },
  {
    id: 'post-3',
    title: 'Community observation',
    body: 'Residents reported repeated suspicious activity near a transport corridor. Community observations remain labelled by verification status.',
    tag: 'Community',
    created_at: agoDays(1),
  },
];
