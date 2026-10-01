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
- Incident reporting with category, description, **editable incident date/time**, a **searchable/tappable map location picker**, and optional **photo + video evidence**.
- Alerts and community/news feed.
- Safety Mode and Sentinel Agent.
- Large panic button at the top of the Home screen.
- Panic activation captures GPS and begins **visible emergency audio recording** after microphone permission is granted.
- SOS message composer pre-filled for **0736598718** with current coordinates and a Google Maps link.
- Emergency call action opens the dialer for **0736598718**.
- On startup Sentinel places **3 session-only demo incidents within 1 km of the current GPS location** (or the fallback demo region if GPS is unavailable), so hotspot/Safety Mode behaviour can be demonstrated immediately.
- Optional Supabase persistence and realtime incident updates.

## Emergency behaviour

Mobile operating systems do not allow an Expo Go app to silently send an SMS or silently place a phone call. Sentinel therefore prepares the SOS message and opens the phone's Messages app, where the user confirms Send. The call action opens the phone dialer, where the user confirms the call.

The configured emergency contact in this build is `0736598718`. Before wider deployment, move emergency contacts into authenticated user settings and integrate only with authorised emergency-response services.

Emergency audio is **not hidden listening**. Recording starts only after the user activates panic mode and grants microphone permission, and Sentinel displays a visible recording indicator and Stop control. In the Expo Go configuration used here, recording is foreground-only.

## Photo and video attachments

Selected incident photos and videos are displayed immediately in the current app session. Each attachment has its own public/private visibility control. Public media in Community starts obscured/blurred and requires the viewer to reveal it.

The database schema includes `image_uri` and `video_uri`, but local device file URIs are not uploaded to Supabase Storage automatically. Add a private storage bucket/upload pipeline before relying on attachments across multiple devices.

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

## Privacy + hotspot update

This build adds:

- public/private visibility per incident report
- independent public/private visibility per attached photo and video
- public Community feed filtering
- blurred/obscured public evidence media with tap-to-reveal
- frequency-coloured map markers: green = 1, amber = 2, red = 3+ reports within ~750 m in the last 7 days, grey = older
- preloaded sample incident clusters for demonstrating the map frequency key
- 2 km foreground Safety Mode alerts recorded in Sentinel's in-app Alerts feed in the Expo Go build

After pulling this build, run:

```bash
npm install
npx expo install --fix
npx expo start -c
```

If you already created the Supabase tables with an older Sentinel schema, rerun `sql/schema.sql` so `incident_at`, `visibility`, `image_visibility`, `video_uri`, `video_visibility`, and `location_label` are added. `incident_at` stores when the event actually happened; `created_at` stores when the report was submitted.

In this Expo Go-stable build, hotspot warnings are recorded in Sentinel's in-app Alerts feed. Background hotspot monitoring and native notification-tray alerts are reserved for a development/production build.

## Report location and private-report behaviour

The report form no longer expects ordinary users to type coordinates. Reporters can search a South African suburb/street/landmark, tap or drag a pin on the map, or use their current GPS location. Coordinates are still stored internally for hotspot and distance calculations.

A report marked **private** is excluded from the public Community feed and public map. It remains in Sentinel's incident set for that user, so Safety Mode scans and Sentinel Agent deliberations can still consider it without publishing the report or its exact public location.

## Expo Go notification note

This project intentionally does not load `expo-notifications` while running through Expo Go on Android. Safety alerts are still created in Sentinel's in-app Alerts feed. Native notification-tray alerts will be enabled when Sentinel moves to a custom development or production build, where the notification module can be configured against Sentinel's own Android application binary.
