# Sentinel update

This build adds:

- Optional incident **video evidence** from the device library or camera.
- Separate public/private visibility for videos, matching photo privacy.
- Public Community videos start blurred/obscured and require an explicit tap to reveal; they can be blurred again.
- Private reports remain excluded from the Community feed and public map while still being considered by Safety Mode and Sentinel Agent safety analysis.
- A user-friendly incident location picker: search by South African area/street/landmark, tap the map, drag the pin, or use current GPS location. Coordinates are retained internally rather than exposed as the main editing method.
- Optional human-readable `location_label` saved with incidents and displayed on public incident cards/map popups.
- Supabase schema fields for `video_uri`, `video_visibility`, and `location_label`.
- Native Expo video playback (`expo-video`) and Android-capable blur (`expo-blur`), both supported by Expo Go for this SDK line.

Existing editable incident date/time, startup nearby sample incidents, hotspot colouring, Safety Mode, Sentinel Agent, panic flow, and Expo Go-stable in-app alerts remain in place.
