import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import EmergencyButton from './components/EmergencyButton';
import IncidentCard from './components/IncidentCard';
import Pill from './components/Pill';
import { SentinelProvider, useSentinel } from './context/SentinelContext';
import { communityPosts, DEMO_REGION } from './data/demoData';
import { getCurrentLocation } from './lib/location';
import { IncidentCategory } from './lib/types';
import { createTestEmergencyAlert } from './services/emergency';
import { findRelevantIncidents } from './services/safety';

const colors = {
  ink: '#071D27',
  muted: '#61727C',
  bg: '#F4F7F8',
  card: '#FFFFFF',
  teal: '#087B78',
  tealDark: '#075D5B',
  red: '#B9342E',
  line: '#DFE7EB',
};

type Screen = 'Home' | 'Map' | 'Report' | 'Alerts' | 'Community';

const categories: IncidentCategory[] = [
  'Robbery',
  'Hijacking',
  'Kidnapping',
  'Suspicious activity',
  'Assault',
  'Other',
];

function Header({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function HomeScreen({ go }: { go: (screen: Screen) => void }) {
  const { incidents, addNotification } = useSentinel();
  const [safetyMode, setSafetyMode] = useState(false);
  const [safetyText, setSafetyText] = useState('Start Safety Mode to check current location context.');
  const [checking, setChecking] = useState(false);

  async function checkSafety() {
    setChecking(true);
    try {
      const location = await getCurrentLocation();
      const relevant = findRelevantIncidents(location, incidents);
      setSafetyMode(true);
      if (relevant.length) {
        const nearest = relevant[0];
        setSafetyText(`${relevant.length} recent report${relevant.length === 1 ? '' : 's'} within 1.5 km. Nearest: ${nearest.incident.category}, ${nearest.distanceKm.toFixed(1)} km away.`);
        addNotification({
          title: 'Proactive safety context',
          message: `${relevant.length} recent report${relevant.length === 1 ? '' : 's'} may be relevant to your current location.`,
          type: 'safety',
        });
      } else {
        setSafetyText('No recent demo incidents were found within 1.5 km of your current location.');
      }
    } catch {
      setSafetyMode(true);
      setSafetyText('Location was unavailable. Use Demo Route Alert below to present Sentinel’s proactive safety concept.');
    } finally {
      setChecking(false);
    }
  }

  function demoRouteAlert() {
    setSafetyMode(true);
    setSafetyText('DEMO ROUTE ALERT: A recent hijacking report intersects the selected route context. Compare alternatives or continue with awareness.');
    addNotification({
      title: 'Route context alert · demo',
      message: 'Recent hijacking reports overlap the selected demo journey. This is not a prediction of crime.',
      type: 'safety',
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
        <View><Text style={styles.brand}>SENTINEL</Text><Text style={styles.brandSub}>Personal Safety Intelligence</Text></View>
      </View>

      <View style={styles.hero}>
        <Pill label="HACKATHON PROTOTYPE" tone="success" />
        <Text style={styles.heroTitle}>Know what matters around you — before it becomes your problem.</Text>
        <Text style={styles.heroText}>Sentinel combines community reports, location context and proactive safety guidance. It does not predict criminals or guarantee safety.</Text>
        <View style={styles.heroActions}>
          <Pressable style={styles.primaryButton} onPress={() => go('Report')}><Text style={styles.primaryButtonText}>Report incident</Text></Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => go('Map')}><Text style={styles.secondaryButtonText}>Open map</Text></Pressable>
        </View>
      </View>

      <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>Safety Mode</Text><Pill label={safetyMode ? 'ACTIVE' : 'READY'} tone={safetyMode ? 'success' : 'neutral'} /></View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Context, not just pins</Text>
        <Text style={styles.cardBody}>{safetyText}</Text>
        <View style={styles.stackGap}>
          <Pressable style={styles.primaryButton} disabled={checking} onPress={checkSafety}><Text style={styles.primaryButtonText}>{checking ? 'Checking location…' : 'Start Safety Mode'}</Text></Pressable>
          <Pressable style={styles.ghostButton} onPress={demoRouteAlert}><Text style={styles.ghostButtonText}>Demo route alert</Text></Pressable>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}><Text style={styles.metricValue}>{incidents.length}</Text><Text style={styles.metricLabel}>visible reports</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{incidents.filter((x) => x.status !== 'unverified').length}</Text><Text style={styles.metricLabel}>corroborated / official</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Emergency</Text>
      <EmergencyPanel />
      <Text style={styles.footnote}>Preloaded records are fictional sample data. Do not use this hackathon build as an emergency service.</Text>
    </ScrollView>
  );
}

function MapScreen() {
  const { incidents } = useSentinel();
  const [selected, setSelected] = useState<IncidentCategory | 'All'>('All');
  const visible = useMemo(() => selected === 'All' ? incidents : incidents.filter((x) => x.category === selected), [incidents, selected]);

  return (
    <View style={styles.flex}>
      <View style={styles.mapHeader}>
        <Header eyebrow="COMMUNITY INTELLIGENCE" title="Safety map" subtitle="Reports are observations, not proof of criminal activity." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', ...categories] as const).map((category) => (
            <Pressable key={category} onPress={() => setSelected(category)} style={[styles.filter, selected === category && styles.filterActive]}>
              <Text style={[styles.filterText, selected === category && styles.filterTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <MapView style={styles.map} initialRegion={DEMO_REGION}>
        {visible.map((incident) => (
          <Marker
            key={incident.id}
            coordinate={{ latitude: incident.latitude, longitude: incident.longitude }}
            title={incident.category}
            description={`${incident.status} · ${incident.description}`}
            pinColor={incident.severity === 'high' ? '#B9342E' : '#D88915'}
          />
        ))}
      </MapView>
      <View style={styles.mapLegend}><Text style={styles.mapLegendText}>{visible.length} visible report{visible.length === 1 ? '' : 's'} · sample + session data</Text></View>
    </View>
  );
}

function ReportScreen({ go }: { go: (screen: Screen) => void }) {
  const { addIncident } = useSentinel();
  const [category, setCategory] = useState<IncidentCategory>('Robbery');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState({ latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude });
  const [busy, setBusy] = useState(false);

  async function useLocation() {
    try {
      const location = await getCurrentLocation();
      setCoords(location);
      Alert.alert('Location added', 'Your current coordinates will be used for this demo report.');
    } catch {
      Alert.alert('Location unavailable', 'Keeping the demo map location.');
    }
  }

  async function submit() {
    if (!description.trim()) {
      Alert.alert('Add a description', 'Briefly describe what was observed.');
      return;
    }
    setBusy(true);
    await addIncident({ category, description: description.trim(), ...coords });
    setBusy(false);
    setDescription('');
    Alert.alert('Report recorded', 'The report is marked unverified and is now visible in this demo session.', [
      { text: 'View map', onPress: () => go('Map') },
      { text: 'OK' },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Header eyebrow="OBSERVE · RECORD · REVIEW" title="Report an incident" subtitle="Do not submit real victim identities or allegations in this hackathon build." />
        <Text style={styles.inputLabel}>Incident category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRowNoPad}>
          {categories.map((item) => (
            <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filter, category === item && styles.filterActive]}>
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.inputLabel}>What did you observe?</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Example: I witnessed a phone robbery near the intersection…"
          multiline
          style={styles.textArea}
          placeholderTextColor="#98A5AC"
        />

        <Text style={styles.inputLabel}>Report location</Text>
        <View style={styles.locationCard}>
          <Text style={styles.coords}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
          <Pressable onPress={useLocation}><Text style={styles.link}>Use my current location</Text></Pressable>
        </View>

        <View style={styles.noticeBox}><Text style={styles.noticeTitle}>Verification design</Text><Text style={styles.noticeText}>Every community report starts as unverified. Repetition alone does not make an allegation true.</Text></View>
        <Pressable style={styles.primaryButton} disabled={busy} onPress={submit}><Text style={styles.primaryButtonText}>{busy ? 'Recording…' : 'Submit report'}</Text></Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AlertsScreen() {
  const { notifications } = useSentinel();
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header eyebrow="PROACTIVE SIGNALS" title="Alerts" subtitle="Why you are being warned matters as much as the warning itself." />
      {notifications.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.sectionTitleRow}><Text style={styles.cardTitle}>{item.title}</Text><Pill label={item.type} tone={item.type === 'emergency' ? 'danger' : item.type === 'safety' ? 'warning' : 'info'} /></View>
          <Text style={styles.cardBody}>{item.message}</Text>
          <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function CommunityScreen() {
  const { incidents } = useSentinel();
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header eyebrow="NEWS + COMMUNITY" title="Safety feed" subtitle="Official, community and safety content are deliberately labelled differently." />
      {communityPosts.map((post) => (
        <View key={post.id} style={styles.card}>
          <View style={styles.sectionTitleRow}><Text style={styles.cardTitle}>{post.title}</Text><Pill label={post.tag} tone={post.tag === 'Official' ? 'success' : post.tag === 'Community' ? 'warning' : 'info'} /></View>
          <Text style={styles.cardBody}>{post.body}</Text>
          <Text style={styles.meta}>{new Date(post.created_at).toLocaleString()}</Text>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Latest incident records</Text>
      {incidents.slice(0, 3).map((incident) => <IncidentCard key={incident.id} incident={incident} />)}
    </ScrollView>
  );
}

function EmergencyPanel() {
  const { addNotification } = useSentinel();
  const [loading, setLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  async function trigger() {
    Alert.alert(
      'Test emergency flow',
      'This hackathon prototype does not contact SAPS, private security, medical services, or any other responder.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue test',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const alert = await createTestEmergencyAlert();
              const message = `Test alert recorded at ${new Date(alert.created_at).toLocaleTimeString()} · ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}`;
              setLastAlert(message);
              addNotification({ title: 'Test emergency event recorded', message, type: 'emergency' });
            } catch (error) {
              Alert.alert('Unable to capture location', error instanceof Error ? error.message : 'Unknown error');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }

  return (
    <View style={styles.stackGap}>
      <EmergencyButton loading={loading} onPress={trigger} />
      {lastAlert ? <View style={styles.noticeBox}><Text style={styles.noticeTitle}>Latest test event</Text><Text style={styles.noticeText}>{lastAlert}</Text></View> : null}
    </View>
  );
}

function MainApp() {
  const [screen, setScreen] = useState<Screen>('Home');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.flex}>
        <View style={styles.flex}>
          {screen === 'Home' && <HomeScreen go={setScreen} />}
          {screen === 'Map' && <MapScreen />}
          {screen === 'Report' && <ReportScreen go={setScreen} />}
          {screen === 'Alerts' && <AlertsScreen />}
          {screen === 'Community' && <CommunityScreen />}
        </View>
        <View style={styles.tabBar}>
          {(['Home', 'Map', 'Report', 'Alerts', 'Community'] as Screen[]).map((item) => (
            <Pressable key={item} onPress={() => setScreen(item)} style={styles.tab}>
              <Text style={[styles.tabIcon, screen === item && styles.tabActive]}>{item === 'Home' ? '⌂' : item === 'Map' ? '◎' : item === 'Report' ? '+' : item === 'Alerts' ? '!' : '◌'}</Text>
              <Text numberOfLines={1} style={[styles.tabText, screen === item && styles.tabActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return <SentinelProvider><MainApp /></SentinelProvider>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 36 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 18 },
  brandMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  brand: { color: colors.ink, fontWeight: '900', letterSpacing: 2, fontSize: 18 },
  brandSub: { color: colors.muted, fontSize: 11, marginTop: 2 },
  header: { marginBottom: 18 },
  eyebrow: { color: colors.teal, fontWeight: '900', fontSize: 11, letterSpacing: 1.4 },
  pageTitle: { color: colors.ink, fontWeight: '900', fontSize: 30, marginTop: 4 },
  pageSubtitle: { color: colors.muted, marginTop: 6, lineHeight: 20 },
  hero: { backgroundColor: colors.ink, padding: 22, borderRadius: 24, marginBottom: 22 },
  heroTitle: { color: '#FFFFFF', fontWeight: '900', fontSize: 28, lineHeight: 33, marginTop: 16 },
  heroText: { color: '#BFD0D8', lineHeight: 20, marginTop: 10 },
  heroActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  primaryButton: { backgroundColor: colors.teal, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', flex: 1 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '900' },
  secondaryButton: { backgroundColor: '#173945', borderWidth: 1, borderColor: '#2E5662', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', flex: 1 },
  secondaryButtonText: { color: '#E7F2F4', fontWeight: '800' },
  ghostButton: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  ghostButtonText: { color: colors.tealDark, fontWeight: '800' },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 6, marginBottom: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 18, padding: 17, marginBottom: 14, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontWeight: '900', fontSize: 16, flex: 1 },
  cardBody: { color: colors.muted, lineHeight: 20, marginTop: 8 },
  metricRow: { flexDirection: 'row', gap: 12, marginVertical: 18 },
  metric: { flex: 1, borderRadius: 18, backgroundColor: '#E5F2F1', padding: 16 },
  metricValue: { fontSize: 27, fontWeight: '900', color: colors.tealDark },
  metricLabel: { color: '#526F70', fontSize: 11, marginTop: 3 },
  stackGap: { gap: 10 },
  footnote: { color: '#82919A', fontSize: 11, lineHeight: 16, marginTop: 14 },
  mapHeader: { backgroundColor: colors.bg, paddingTop: 16 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  filterRowNoPad: { gap: 8, paddingBottom: 8 },
  filter: { borderRadius: 999, backgroundColor: '#E6ECEF', paddingHorizontal: 13, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.ink },
  filterText: { color: '#53646E', fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  map: { flex: 1 },
  mapLegend: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(7,29,39,0.90)', padding: 12, borderRadius: 14 },
  mapLegendText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  inputLabel: { color: colors.ink, fontWeight: '900', marginTop: 10, marginBottom: 8 },
  textArea: { minHeight: 140, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, textAlignVertical: 'top', color: colors.ink, fontSize: 15 },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 14 },
  coords: { color: colors.ink, fontWeight: '800' },
  link: { color: colors.teal, fontWeight: '900', marginTop: 8 },
  noticeBox: { backgroundColor: '#EEF4F5', borderRadius: 14, padding: 14, marginVertical: 10 },
  noticeTitle: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  noticeText: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: 4 },
  meta: { color: '#87959D', fontSize: 11, marginTop: 10 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.line, paddingVertical: 8, paddingHorizontal: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  tabIcon: { color: '#89979E', fontSize: 19, fontWeight: '900' },
  tabText: { color: '#89979E', fontSize: 9, fontWeight: '700', marginTop: 2 },
  tabActive: { color: colors.tealDark },
});
