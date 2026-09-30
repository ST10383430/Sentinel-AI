# Sentinel — Hackathon Mobile Prototype

**Sentinel** is a proactive personal-safety intelligence prototype built with Expo + React Native + TypeScript.

The differentiator is not simply a crime map. Sentinel takes incident observations and turns them into **contextual safety information** through Safety Mode, while clearly separating unverified community reports from corroborated/official information.

## What works in this ZIP

- Interactive map with sample incident markers and category filters
- Incident reporting that immediately updates the map and alerts feed
- Safety Mode using the phone's foreground GPS
- A deterministic proactive-risk check for recent incidents within 1.5 km
- A **Demo Route Alert** for a guaranteed hackathon demonstration
- Test emergency/panic flow that captures GPS and records a local/Supabase event
- Alerts feed
- News/community feed with source labels
- Supabase-ready incident and emergency persistence
- Local demo fallback: the app works without Supabase

## Important safety statement

This is a hackathon prototype. The emergency button **does not contact SAPS, medical services, private security, or any other responder**. Preloaded incident data is fictional demo data.

## Requirements

Current Expo SDK 57 requires Node.js 22.13.x or newer in the SDK 57 documentation.

Install:

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go on a compatible device.

If package versions need reconciliation on your machine:

```bash
npx expo install --fix
```

## Optional Supabase setup

The app runs without Supabase. To enable cloud persistence:

1. Create a Supabase project.
2. Run `sql/schema.sql` in the Supabase SQL editor.
3. Copy `.env.example` to `.env`.
4. Fill in:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Restart Expo.

**Never put a Supabase service-role key in a mobile app.**

## Four-hour demo flow

1. Open **Home** and explain Sentinel's proactive-safety proposition.
2. Open **Report**, submit a sample robbery/hijacking report.
3. Open **Map** and show that the new report appears immediately.
4. Open **Alerts** and show the automatically-created unverified report alert.
5. Return to **Home → Demo route alert** to demonstrate personalised/contextual safety intelligence.
6. Trigger the **test emergency distress** flow and show captured location + timestamp.
7. Finish on **Community** to explain official/community source separation.

## Team split

### Person 1 — Map + reporting
Primary areas:
- `App.tsx` map/report screens
- `components/IncidentCard.tsx`
- UI refinement for map markers and filters

### Person 2 — Backend + GPS + emergency (your area)
Primary files:
- `lib/supabase.ts`
- `lib/location.ts`
- `lib/types.ts`
- `services/incidents.ts`
- `services/emergency.ts`
- `services/safety.ts`
- `sql/schema.sql`

Your success condition:

`Report → local state/Supabase → map + alert` and `Panic → GPS → test emergency event`.

### Person 3 — Alerts + community + presentation polish
Primary areas:
- Alerts screen in `App.tsx`
- Community screen in `App.tsx`
- `data/demoData.ts`
- Copy, labels, demo content and presentation flow

## Recommended VS Code extensions

The repo includes `.vscode/extensions.json` for:

- ESLint
- Prettier
- Expo Tools
- GitLens
- Error Lens

## Architecture

```text
Citizen / observer
      |
      v
React Native + Expo
  |      |       |
Report  Safety  Emergency
  |      Mode     GPS
  |       |       |
  +-------+-------+
          |
     Shared local state
          |
     Optional Supabase
          |
   Map + Alerts + Feed
```

## Deliberately not included in the 4-hour build

- Real emergency dispatch
- SAPS/prosecutor integration
- Background GPS
- Automated criminal identification
- Production authentication
- Predictive policing
- Dynamic route rerouting
- Advanced AI agent orchestration

These belong in the roadmap, not the hackathon MVP.
