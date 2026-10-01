import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Incident } from '../lib/types';
import Pill from './Pill';

export default function IncidentCard({ incident, community = false }: { incident: Incident; community?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const tone = incident.severity === 'high' ? 'danger' : incident.severity === 'medium' ? 'warning' : 'success';
  const reportPublic = incident.visibility !== 'private';
  const imagePublic = incident.image_visibility === 'public';
  const canShowImage = Boolean(incident.image_uri) && (!community || (reportPublic && imagePublic));

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{incident.category}</Text>
        <Pill label={incident.status} tone={tone} />
      </View>

      {canShowImage ? (
        <Pressable onPress={() => community && setRevealed((value) => !value)} disabled={!community} style={styles.imageWrap}>
          <Image
            source={{ uri: incident.image_uri! }}
            style={styles.image}
            resizeMode="cover"
            blurRadius={community && !revealed ? 24 : 0}
          />
          {community && !revealed ? (
            <View style={styles.blurOverlay} pointerEvents="none">
              <Text style={styles.blurTitle}>Sensitive image hidden</Text>
              <Text style={styles.blurText}>Tap to reveal</Text>
            </View>
          ) : community ? (
            <View style={styles.reblurTag} pointerEvents="none"><Text style={styles.reblurText}>Tap to blur</Text></View>
          ) : null}
        </Pressable>
      ) : null}

      {community && incident.image_uri && !imagePublic ? (
        <View style={styles.privateImageNote}><Text style={styles.privateImageText}>Photo kept private by reporter</Text></View>
      ) : null}

      <Text style={styles.body}>{incident.description}</Text>
      <Text style={styles.meta}>{new Date(incident.created_at).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E3EAEE' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#0B2430', flex: 1 },
  imageWrap: { marginTop: 12, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E7ECEF' },
  image: { width: '100%', height: 180, backgroundColor: '#E7ECEF' },
  blurOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(7,29,39,0.20)' },
  blurTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4 },
  blurText: { color: '#FFFFFF', fontWeight: '700', marginTop: 4, fontSize: 12, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 4 },
  reblurTag: { position: 'absolute', right: 8, bottom: 8, backgroundColor: 'rgba(7,29,39,0.75)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  reblurText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  privateImageNote: { marginTop: 12, backgroundColor: '#F1F4F5', borderRadius: 10, padding: 10 },
  privateImageText: { color: '#61727C', fontSize: 11, fontWeight: '700' },
  body: { marginTop: 8, color: '#425563', lineHeight: 19 },
  meta: { marginTop: 10, color: '#82919A', fontSize: 11 },
});
