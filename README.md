# Sentinel — Personal Safety Intelligence

Sentinel is an Expo + React Native + TypeScript mobile application for community incident reporting, proactive safety context, emergency assistance, alerts, and community information.

## Run the app

Requirements: Node.js 22.13.x or newer and Expo Go on the Android phone.

```cmd
npm install
npx expo install --fix
npx expo start -c
```

If PowerShell blocks npm/npx scripts, use Command Prompt in VS Code or run `npm.cmd` / `npx.cmd`.

## Current features

- Safe-area-aware Android layout so content stays below the status bar and above Android navigation controls.
- Large bottom navigation targets.
- Safety map implemented with a WebView + Leaflet/OpenStreetMap to avoid the black native-map issue seen on some Expo Go Android devices.
- Incident reporting with category, description, location and an **optional image** from the camera or gallery.
- Alerts and community/news feed.
- Safety Mode and Sentinel Agent.
- Large panic button at the top of the Home screen.
- Panic activation captures GPS and begins **visible emergency audio recording** after microphone permission is granted.
- SOS message composer pre-filled for **0736598718** with current coordinates and a Google Maps link.
- Emergency call action opens the dialer for **0736598718**.
- Optional Supabase persistence and realtime incident updates.

## Emergency behaviour

Mobile operating systems do not allow an Expo Go app to silently send an SMS or silently place a phone call. Sentinel therefore prepares the SOS message and opens the phone's Messages app, where the user confirms Send. The call action opens the phone dialer, where the user confirms the call.

The configured emergency contact in this build is `0736598718`. Before wider deployment, move emergency contacts into authenticated user settings and integrate only with authorised emergency-response services.

Emergency audio is **not hidden listening**. Recording starts only after the user activates panic mode and grants microphone permission, and Sentinel displays a visible recording indicator and Stop control. In the Expo Go configuration used here, recording is foreground-only.

## Image attachments

Selected incident images are displayed immediately in the current app session. The database schema includes `image_uri`, but local device file URIs are not uploaded to Supabase Storage automatically. Add a private storage bucket/upload pipeline before relying on attachments across multiple devices.

## Optional Supabase

1. Create a Supabase project.
2. Run `sql/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env`.
4. Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Restart Expo with `npx expo start -c`.

Never place a Supabase service-role key or AI provider secret inside the mobile application.

## Main project areas

- `App.tsx` — screens, navigation and emergency UI
- `components/SentinelMap.tsx` — Leaflet/OpenStreetMap map
- `components/EmergencyButton.tsx` — large panic control
- `hooks/useEmergencyAudio.ts` — microphone recording
- `services/emergency.ts` — location alert, SOS message and call actions
- `services/incidents.ts` — incident persistence
- `sql/schema.sql` — Supabase schema
