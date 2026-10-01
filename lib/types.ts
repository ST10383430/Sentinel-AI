export type IncidentCategory =
  | 'Robbery'
  | 'Hijacking'
  | 'Kidnapping'
  | 'Suspicious activity'
  | 'Assault'
  | 'Other';

export type VerificationStatus = 'unverified' | 'corroborated' | 'official';
export type Visibility = 'public' | 'private';

export type Incident = {
  id: string;
  category: IncidentCategory;
  description: string;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high';
  status: VerificationStatus;
  created_at: string;
  source?: 'community' | 'official' | 'demo';
  image_uri?: string | null;
  visibility?: Visibility;
  image_visibility?: Visibility;
};

export type SafetyNotification = {
  id: string;
  title: string;
  message: string;
  type: 'incident' | 'safety' | 'emergency' | 'system';
  created_at: string;
};

export type EmergencyAlert = {
  id: string;
  latitude: number;
  longitude: number;
  status: 'triggered';
  created_at: string;
};

export type CommunityPost = {
  id: string;
  title: string;
  body: string;
  tag: 'Official' | 'Community' | 'Safety';
  created_at: string;
};
