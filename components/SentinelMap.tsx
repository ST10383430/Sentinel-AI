import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Incident } from '../lib/types';

type Coords = { latitude: number; longitude: number };

function buildMapHtml(incidents: Incident[], center: Coords, userLocation: Coords | null) {
  const markerData = incidents.map((incident) => ({
    id: incident.id,
    category: incident.category,
    description: incident.description,
    latitude: incident.latitude,
    longitude: incident.longitude,
    severity: incident.severity,
    status: incident.status,
  }));

  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #E8EEF0; }
    .leaflet-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .sentinel-popup strong { color: #071D27; font-size: 14px; }
    .sentinel-popup .status { color: #087B78; font-weight: 700; text-transform: capitalize; margin: 4px 0; }
    .sentinel-popup .desc { color: #4F636E; line-height: 1.35; max-width: 220px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <script>
    (function () {
      function esc(value) {
        return String(value == null ? '' : value)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${center.latitude}, ${center.longitude}], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var incidents = ${JSON.stringify(markerData)};
      incidents.forEach(function (incident) {
        var color = incident.severity === 'high' ? '#B9342E' : '#D88915';
        var marker = L.circleMarker([incident.latitude, incident.longitude], {
          radius: 9,
          color: '#FFFFFF',
          weight: 3,
          fillColor: color,
          fillOpacity: 1
        }).addTo(map);
        marker.bindPopup(
          '<div class="sentinel-popup"><strong>' + esc(incident.category) + '</strong>' +
          '<div class="status">' + esc(incident.status) + '</div>' +
          '<div class="desc">' + esc(incident.description) + '</div></div>'
        );
      });

      var user = ${JSON.stringify(userLocation)};
      if (user) {
        L.circleMarker([user.latitude, user.longitude], {
          radius: 9,
          color: '#FFFFFF',
          weight: 3,
          fillColor: '#2563EB',
          fillOpacity: 1
        }).addTo(map).bindPopup('<strong>Your location</strong>');
      }

      setTimeout(function () { map.invalidateSize(); }, 150);
    })();
  </script>
</body>
</html>`;
}

export default function SentinelMap({
  incidents,
  center,
  userLocation,
}: {
  incidents: Incident[];
  center: Coords;
  userLocation: Coords | null;
}) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => buildMapHtml(incidents, center, userLocation), [incidents, center, userLocation]);
  const mapKey = `${center.latitude.toFixed(4)}-${center.longitude.toFixed(4)}-${incidents.map((x) => x.id).join('|')}-${userLocation?.latitude ?? 'x'}`;

  return (
    <View style={styles.container}>
      <WebView
        key={mapKey}
        source={{ html }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        style={styles.webview}
        onLoadStart={() => { setLoading(true); setFailed(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
      />
      {loading ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#087B78" />
          <Text style={styles.loadingText}>Loading safety map…</Text>
        </View>
      ) : null}
      {failed ? (
        <View style={styles.errorOverlay} pointerEvents="none">
          <Text style={styles.errorTitle}>Map unavailable</Text>
          <Text style={styles.errorText}>Check your internet connection. Incident reports remain available in the Alerts and Community screens.</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EEF0' },
  webview: { flex: 1, backgroundColor: '#E8EEF0' },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(232,238,240,0.82)' },
  loadingText: { marginTop: 10, color: '#53646E', fontWeight: '700' },
  errorOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#E8EEF0' },
  errorTitle: { color: '#071D27', fontSize: 18, fontWeight: '900' },
  errorText: { color: '#61727C', textAlign: 'center', lineHeight: 20, marginTop: 8 },
});
