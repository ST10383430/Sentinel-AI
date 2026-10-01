# Sentinel update

This build adds:

- Editable incident date and time on the Report an Incident screen. Both default to the current local date/time.
- A separate `incident_at` timestamp so Sentinel can distinguish when an incident happened from when the report was submitted.
- Editable incident latitude and longitude fields, plus a "Use my current location" shortcut.
- Three session-only demo incidents placed within 1 km of the device's current location at startup (with a Johannesburg demo-region fallback when location is unavailable).
- Hotspot colouring, Safety Mode recency checks, map popup times, community cards, and agent recency now use the incident occurrence time rather than only the report submission time.
- Supabase schema migration for `incident_at`.

The Expo Go-stable notification behaviour is unchanged: hotspot alerts appear in Sentinel's in-app Alerts feed; native notification-tray alerts remain deferred to the development/production build.
