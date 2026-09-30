import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Incident } from '../lib/types';
import Pill from './Pill';

export default function IncidentCard({ incident }: { incident: Incident }) {
  const tone = incident.severity === 'high' ? 'danger' : incident.severity === 'medium' ? 'warning' : 'success';
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title}>{incident.category}</Text>
        <Pill label={incident.status} tone={tone} />
      </View>
      {incident.image_uri ? <Image source={{ uri: incident.image_uri }} style={styles.image} resizeMode="cover" /> : null}
      <Text style={styles.body}>{incident.description}</Text>
      <Text style={styles.meta}>{new Date(incident.created_at).toLocaleString()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E3EAEE' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: '#0B2430', flex: 1 },
  image: { width: '100%', height: 170, borderRadius: 14, marginTop: 12, backgroundColor: '#E7ECEF' },
  body: { marginTop: 8, color: '#425563', lineHeight: 19 },
  meta: { marginTop: 10, color: '#82919A', fontSize: 11 },
});
