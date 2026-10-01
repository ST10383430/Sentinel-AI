import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import EmergencyButton from './components/EmergencyButton';
import SentinelMap from './components/SentinelMap';
import IncidentCard from './components/IncidentCard';
import Pill from './components/Pill';
import { SentinelProvider, useSentinel } from './context/SentinelContext';
import { communityPosts, DEMO_REGION } from './data/demoData';
import { ensureLocationPermission, getCurrentLocation } from './lib/location';
import { useSafetyMode } from './hooks/useSafetyMode';
import { IncidentCategory, Visibility } from './lib/types';
import { AgentResult, runAgent } from './services/agent';
import { createEmergencyAlert, EMERGENCY_CONTACT_NUMBER, openEmergencyCall, openSosMessage } from './services/emergency';
import { useEmergencyAudio } from './hooks/useEmergencyAudio';

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

type Screen = 'Home' | 'Map' | 'Report' | 'Agent' | 'Alerts' | 'Community';
type Focus = { latitude: number; longitude: number } | null;
type Go = (screen: Screen, focus?: Focus) => void;
type SafetyMode = ReturnType<typeof useSafetyMode>;

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

function HomeScreen({ go, safety }: { go: Go; safety: SafetyMode }) {
  const { incidents } = useSentinel();
  const { active: safetyMode, busy: checking, text: safetyText } = safety;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>S</Text></View>
        <View><Text style={styles.brand}>SENTINEL</Text><Text style={styles.brandSub}>Personal Safety Intelligence</Text></View>
      </View>

      <EmergencyPanel />

      <View style={styles.hero}>
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
          <Pressable style={styles.primaryButton} disabled={checking} onPress={safetyMode ? safety.stop : safety.start}><Text style={styles.primaryButtonText}>{checking ? 'Checking location…' : safetyMode ? 'Stop Safety Mode' : 'Start Safety Mode'}</Text></Pressable>
          <Pressable style={styles.ghostButton} onPress={safety.showPreviewAlert}><Text style={styles.ghostButtonText}>Preview safety alert</Text></Pressable>
        </View>
      </View>

      <View style={styles.metricRow}>
        <View style={styles.metric}><Text style={styles.metricValue}>{incidents.length}</Text><Text style={styles.metricLabel}>visible reports</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{incidents.filter((x) => x.status !== 'unverified').length}</Text><Text style={styles.metricLabel}>corroborated / official</Text></View>
      </View>

      <Text style={styles.footnote}>Report verification status is shown throughout Sentinel so community observations are not presented as confirmed facts.</Text>
    </ScrollView>
  );
}

function MapScreen({ focus }: { focus: Focus }) {
  const { incidents } = useSentinel();
  const [selected, setSelected] = useState<IncidentCategory | 'All'>('All');
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<Focus>(null);
  const [mapCenter, setMapCenter] = useState({
    latitude: focus?.latitude ?? DEMO_REGION.latitude,
    longitude: focus?.longitude ?? DEMO_REGION.longitude,
  });

  // Private reports never expose an individual marker/location on the public map.
  const publicIncidents = useMemo(() => incidents.filter((x) => x.visibility !== 'private'), [incidents]);
  const visible = useMemo(
    () => selected === 'All' ? publicIncidents : publicIncidents.filter((x) => x.category === selected),
    [publicIncidents, selected],
  );

  useEffect(() => {
    if (focus) setMapCenter({ latitude: focus.latitude, longitude: focus.longitude });
  }, [focus]);

  useEffect(() => {
    ensureLocationPermission()
      .then(() => getCurrentLocation())
      .then((location) => setUserLocation(location))
      .catch(() => setUserLocation(null));
  }, []);

  async function centreOnMe() {
    setLocating(true);
    try {
      const me = await getCurrentLocation();
      setUserLocation(me);
      setMapCenter(me);
    } catch (error) {
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Unable to determine your location.');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.flex}>
      <View style={styles.mapHeader}>
        <Header eyebrow="COMMUNITY INTELLIGENCE" title="Safety map" subtitle="Marker colour reflects recent report frequency in the surrounding area." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['All', ...categories] as const).map((category) => (
            <Pressable key={category} onPress={() => setSelected(category)} style={[styles.filter, selected === category && styles.filterActive]}>
              <Text style={[styles.filterText, selected === category && styles.filterTextActive]}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.frequencyLegend}>
          <Text style={styles.frequencyLegendTitle}>MAP COLOUR KEY · LAST 7 DAYS</Text>
          <View style={styles.frequencyLegendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} /><Text style={styles.legendText}>1 report</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} /><Text style={styles.legendText}>2 reports</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} /><Text style={styles.legendText}>3+ reports</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#64748B' }]} /><Text style={styles.legendText}>Older</Text></View>
          </View>
          <Text style={styles.frequencyLegendNote}>Frequency is calculated from reports within roughly 750 m. It indicates report activity, not certainty that a crime will occur.</Text>
        </View>
      </View>
      <SentinelMap incidents={visible} center={mapCenter} userLocation={userLocation} />
      <Pressable style={styles.locateButton} onPress={centreOnMe} disabled={locating}>
        <Text style={styles.locateText}>{locating ? '…' : '◎'}</Text>
      </Pressable>
      <View style={styles.mapLegend}><Text style={styles.mapLegendText}>{visible.length} public report{visible.length === 1 ? '' : 's'} visible · OpenStreetMap</Text></View>
    </View>
  );
}

function PrivacyChoice({
  value,
  onChange,
  publicLabel,
  privateLabel,
}: {
  value: Visibility;
  onChange: (value: Visibility) => void;
  publicLabel: string;
  privateLabel: string;
}) {
  return (
    <View style={styles.privacyChoiceRow}>
      <Pressable onPress={() => onChange('public')} style={[styles.privacyChoice, value === 'public' && styles.privacyChoiceActive]}>
        <Text style={[styles.privacyChoiceTitle, value === 'public' && styles.privacyChoiceTitleActive]}>Public</Text>
        <Text style={[styles.privacyChoiceText, value === 'public' && styles.privacyChoiceTextActive]}>{publicLabel}</Text>
      </Pressable>
      <Pressable onPress={() => onChange('private')} style={[styles.privacyChoice, value === 'private' && styles.privacyChoiceActive]}>
        <Text style={[styles.privacyChoiceTitle, value === 'private' && styles.privacyChoiceTitleActive]}>Private</Text>
        <Text style={[styles.privacyChoiceText, value === 'private' && styles.privacyChoiceTextActive]}>{privateLabel}</Text>
      </Pressable>
    </View>
  );
}

function ReportScreen({ go }: { go: Go }) {
  const { addIncident } = useSentinel();
  const [category, setCategory] = useState<IncidentCategory>('Robbery');
  const [description, setDescription] = useState('');
  const [coords, setCoords] = useState({ latitude: DEMO_REGION.latitude, longitude: DEMO_REGION.longitude });
  const [busy, setBusy] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [reportVisibility, setReportVisibility] = useState<Visibility>('private');
  const [imageVisibility, setImageVisibility] = useState<Visibility>('private');

  async function addImage(source: 'library' | 'camera') {
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera permission required', 'Allow camera access to take a photo for the report.');
          return;
        }
      }

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });

      if (!result.canceled && result.assets[0]?.uri) setImageUri(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Unable to add image', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function useLocation() {
    try {
      const location = await getCurrentLocation();
      setCoords(location);
      Alert.alert('Location added', 'Your current coordinates will be used for this report.');
    } catch {
      Alert.alert('Location unavailable', 'Keeping the default map location.');
    }
  }

  async function submit() {
    if (!description.trim()) {
      Alert.alert('Add a description', 'Briefly describe what was observed.');
      return;
    }
    setBusy(true);
    try {
      const { incident, synced } = await addIncident({
        category,
        description: description.trim(),
        ...coords,
        image_uri: imageUri,
        visibility: reportVisibility,
        image_visibility: imageUri ? imageVisibility : 'private',
      });

      const wasPublic = reportVisibility === 'public';
      setDescription('');
      setImageUri(null);
      setReportVisibility('private');
      setImageVisibility('private');

      const storageText = synced ? 'saved securely' : 'kept in this app session';
      Alert.alert(
        'Report recorded',
        wasPublic
          ? `The unverified report is public and can appear on the map/community feed. It was ${storageText}.`
          : `The unverified report is private and will not appear on the public map or community feed. It was ${storageText}.`,
        wasPublic
          ? [
              { text: 'View map', onPress: () => go('Map', { latitude: incident.latitude, longitude: incident.longitude }) },
              { text: 'OK' },
            ]
          : [{ text: 'OK' }],
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Header eyebrow="OBSERVE · RECORD · REVIEW" title="Report an incident" subtitle="You control what is shared publicly. Private reports and private photos are excluded from the public community feed." />

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

        <Text style={styles.inputLabel}>Who can see this report?</Text>
        <PrivacyChoice
          value={reportVisibility}
          onChange={setReportVisibility}
          publicLabel="Can appear on the safety map and Community feed."
          privateLabel="Kept out of public map and Community records."
        />

        <Text style={styles.inputLabel}>Image (optional)</Text>
        <View style={styles.imagePickerCard}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.reportImagePreview} resizeMode="cover" /> : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderIcon}>▧</Text>
              <Text style={styles.imagePlaceholderText}>Attach a photo if it helps document the incident. A photo is never required to submit.</Text>
            </View>
          )}
          <View style={styles.imageActionRow}>
            <Pressable style={styles.imageActionButton} onPress={() => addImage('library')}><Text style={styles.imageActionText}>Choose photo</Text></Pressable>
            <Pressable style={styles.imageActionButton} onPress={() => addImage('camera')}><Text style={styles.imageActionText}>Take photo</Text></Pressable>
            {imageUri ? <Pressable style={styles.imageRemoveButton} onPress={() => setImageUri(null)}><Text style={styles.imageRemoveText}>Remove</Text></Pressable> : null}
          </View>
        </View>

        {imageUri ? (
          <>
            <Text style={styles.inputLabel}>Who can see this photo?</Text>
            <PrivacyChoice
              value={imageVisibility}
              onChange={setImageVisibility}
              publicLabel="If the report is public, the photo appears blurred until a viewer taps it."
              privateLabel="The report may be public, but this photo will never appear in Community."
            />
          </>
        ) : null}

        <Text style={styles.inputLabel}>Report location</Text>
        <View style={styles.locationCard}>
          <Text style={styles.coords}>{coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</Text>
          <Pressable onPress={useLocation}><Text style={styles.link}>Use my current location</Text></Pressable>
        </View>

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>Privacy + verification</Text>
          <Text style={styles.noticeText}>Every community report starts as unverified. Public/private controls affect publication; they do not change the report's verification status.</Text>
        </View>
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
  const publicIncidents = useMemo(
    () => incidents.filter((incident) => incident.visibility !== 'private').slice(0, 5),
    [incidents],
  );

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <Header eyebrow="NEWS + COMMUNITY" title="Safety feed" subtitle="Only reports the reporter chose to make public can appear in Latest incident records." />
      {communityPosts.map((post) => (
        <View key={post.id} style={styles.card}>
          <View style={styles.sectionTitleRow}><Text style={styles.cardTitle}>{post.title}</Text><Pill label={post.tag} tone={post.tag === 'Official' ? 'success' : post.tag === 'Community' ? 'warning' : 'info'} /></View>
          <Text style={styles.cardBody}>{post.body}</Text>
          <Text style={styles.meta}>{new Date(post.created_at).toLocaleString()}</Text>
        </View>
      ))}
      <Text style={styles.sectionTitle}>Latest incident records</Text>
      {publicIncidents.length ? publicIncidents.map((incident) => <IncidentCard key={incident.id} incident={incident} community />) : (
        <View style={styles.noticeBox}><Text style={styles.noticeText}>No public incident records are available yet.</Text></View>
      )}
    </ScrollView>
  );
}

function EmergencyPanel() {
  const { addNotification } = useSentinel();
  const audio = useEmergencyAudio();
  const [loading, setLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);
  const [sosMessage, setSosMessage] = useState<string | null>(null);

  async function messageContact() {
    if (!sosMessage) return;
    try {
      await openSosMessage(sosMessage);
    } catch (error) {
      Alert.alert('Unable to open messages', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function callContact() {
    try {
      await openEmergencyCall();
    } catch (error) {
      Alert.alert('Unable to open phone', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  async function trigger() {
    setLoading(true);
    let recordingStarted = false;

    try {
      try {
        await audio.startRecording();
        recordingStarted = true;
      } catch (error) {
        // Emergency location/contact flow continues even if the user declines microphone access.
        console.warn('Emergency audio did not start:', error);
      }

      const { alert, synced, sosMessage: message } = await createEmergencyAlert();
      setSosMessage(message);
      const summary = `Emergency activated at ${new Date(alert.created_at).toLocaleTimeString()} · ${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}${synced ? ' · saved securely' : ''}`;
      setLastAlert(summary);
      addNotification({ title: 'Emergency mode activated', message: summary, type: 'emergency' });

      Alert.alert(
        'Emergency mode active',
        `${summary}\n\n${recordingStarted ? 'Emergency audio recording is active while Sentinel remains in the foreground.' : 'Microphone recording is not active.'}`,
        [
          { text: 'Message contact', onPress: () => void openSosMessage(message) },
          { text: 'Call contact', onPress: () => void openEmergencyCall() },
          { text: 'Keep Sentinel open', style: 'cancel' },
        ],
      );
    } catch (error) {
      Alert.alert('Emergency activation failed', error instanceof Error ? error.message : 'Unable to capture your current location.');
    } finally {
      setLoading(false);
    }
  }

  async function stopAudio() {
    try {
      const uri = await audio.stopRecording();
      addNotification({
        title: 'Emergency audio stopped',
        message: uri ? 'The emergency recording was saved on this device.' : 'Emergency audio recording stopped.',
        type: 'system',
      }, { push: false });
    } catch (error) {
      Alert.alert('Unable to stop recording', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  return (
    <View style={styles.emergencyPanel}>
      <EmergencyButton loading={loading} onPress={trigger} />

      {audio.isRecording ? (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDot} />
          <View style={styles.recordingCopy}>
            <Text style={styles.recordingTitle}>Emergency audio recording</Text>
            <Text style={styles.recordingText}>Microphone is active. Recording is visible and only starts when the panic flow is activated.</Text>
          </View>
          <Pressable style={styles.stopRecordingButton} onPress={stopAudio}>
            <Text style={styles.stopRecordingText}>Stop</Text>
          </Pressable>
        </View>
      ) : null}

      {lastAlert ? (
        <View style={styles.emergencyActiveCard}>
          <Text style={styles.emergencyActiveTitle}>Emergency actions</Text>
          <Text style={styles.noticeText}>{lastAlert}</Text>
          <View style={styles.emergencyActionRow}>
            <Pressable style={styles.emergencyActionButton} onPress={messageContact} disabled={!sosMessage}>
              <Text style={styles.emergencyActionButtonText}>Message SOS</Text>
              <Text style={styles.emergencyActionButtonSub}>{EMERGENCY_CONTACT_NUMBER}</Text>
            </Pressable>
            <Pressable style={[styles.emergencyActionButton, styles.emergencyCallButton]} onPress={callContact}>
              <Text style={styles.emergencyActionButtonText}>Call contact</Text>
              <Text style={styles.emergencyActionButtonSub}>{EMERGENCY_CONTACT_NUMBER}</Text>
            </Pressable>
          </View>
          <Text style={styles.emergencyLegalText}>Your phone requires confirmation before an SMS is sent or a call is placed. Sentinel does not silently send messages or make calls.</Text>
        </View>
      ) : null}
    </View>
  );
}

const DEFAULT_QUESTION = 'Give me a safety briefing for where I am right now.';

function AgentScreen({ safety }: { safety: SafetyMode }) {
  const { incidents, addNotification } = useSentinel();
  const [question, setQuestion] = useState(DEFAULT_QUESTION);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;

  async function ask() {
    setRunning(true);
    try {
      const outcome = await runAgent(question.trim() || DEFAULT_QUESTION, {
        getLocation: getCurrentLocation,
        getIncidents: () => incidentsRef.current,
        notify: (title, message) => addNotification({ title, message, type: 'safety' }),
      });
      setResult(outcome);
    } catch (error) {
      Alert.alert('Agent failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Header eyebrow="AGENTIC SAFETY ASSISTANT" title="Sentinel Agent" subtitle="Reads your GPS and nearby reports, then explains what is relevant. It cannot contact responders." />
        <TextInput value={question} onChangeText={setQuestion} multiline style={[styles.textArea, styles.agentInput]} placeholderTextColor="#98A5AC" />
        <View style={styles.agentActions}>
          <Pressable style={styles.primaryButton} disabled={running} onPress={ask}>
            <Text style={styles.primaryButtonText}>{running ? 'Agent working…' : 'Ask Sentinel'}</Text>
          </Pressable>
        </View>
        {safety.active ? <Text style={styles.footnote}>Live Safety Mode is on: new nearby reports will also notify you.</Text> : null}
        {result ? (
          <View style={styles.card}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.cardTitle}>Briefing</Text>
              <Pill label={result.mode === 'ai' ? 'AI AGENT' : 'ON-DEVICE'} tone={result.mode === 'ai' ? 'success' : 'info'} />
            </View>
            <Text style={styles.cardBody}>{result.text}</Text>
            {result.note ? <Text style={styles.meta}>{result.note}</Text> : null}
            {result.steps.length ? (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeTitle}>What the agent did</Text>
                {result.steps.map((step, index) => (
                  <Text key={index} style={styles.noticeText} numberOfLines={2}>
                    {index + 1}. {step.tool} → {step.result}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const TAB_ICONS: Record<Screen, string> = { Home: '⌂', Map: '◎', Report: '+', Agent: '✦', Alerts: '!', Community: '◌' };

function MainApp() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<Screen>('Home');
  const [mapFocus, setMapFocus] = useState<Focus>(null);
  const safety = useSafetyMode();

  const go: Go = (next, focus) => {
    if (focus !== undefined) setMapFocus(focus);
    setScreen(next);
  };

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      <View style={styles.flex}>
        <View style={styles.flex}>
          {screen === 'Home' && <HomeScreen go={go} safety={safety} />}
          {screen === 'Map' && <MapScreen focus={mapFocus} />}
          {screen === 'Report' && <ReportScreen go={go} />}
          {screen === 'Agent' && <AgentScreen safety={safety} />}
          {screen === 'Alerts' && <AlertsScreen />}
          {screen === 'Community' && <CommunityScreen />}
        </View>
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {(Object.keys(TAB_ICONS) as Screen[]).map((item) => (
            <Pressable key={item} onPress={() => setScreen(item)} style={styles.tab}>
              <Text style={[styles.tabIcon, screen === item && styles.tabActive]}>{TAB_ICONS[item]}</Text>
              <Text numberOfLines={1} style={[styles.tabText, screen === item && styles.tabActive]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SentinelProvider><MainApp /></SentinelProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30 },
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
  emergencyPanel: { gap: 10, marginBottom: 22 },
  recordingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0EF', borderWidth: 1, borderColor: '#F3B8B3', borderRadius: 16, padding: 12, gap: 10 },
  recordingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D92D20' },
  recordingCopy: { flex: 1 },
  recordingTitle: { color: '#7A1E19', fontWeight: '900', fontSize: 13 },
  recordingText: { color: '#88524F', fontSize: 11, lineHeight: 15, marginTop: 3 },
  stopRecordingButton: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#E7A6A1', paddingVertical: 8, paddingHorizontal: 11 },
  stopRecordingText: { color: '#9E211A', fontWeight: '900', fontSize: 12 },
  emergencyActiveCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#F0C4C0', padding: 14 },
  emergencyActiveTitle: { color: '#7A1E19', fontWeight: '900', fontSize: 14 },
  emergencyActionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  emergencyActionButton: { flex: 1, backgroundColor: '#B3261E', borderRadius: 13, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
  emergencyCallButton: { backgroundColor: '#7A1E19' },
  emergencyActionButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12 },
  emergencyActionButtonSub: { color: '#FFDAD6', fontSize: 10, marginTop: 3 },
  emergencyLegalText: { color: '#7C6A68', fontSize: 10, lineHeight: 14, marginTop: 10 },
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
  imagePickerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 12, marginBottom: 14 },
  reportImagePreview: { width: '100%', height: 210, borderRadius: 13, backgroundColor: '#E7ECEF' },
  imagePlaceholder: { minHeight: 125, borderRadius: 13, backgroundColor: '#EEF3F5', alignItems: 'center', justifyContent: 'center', padding: 20 },
  imagePlaceholderIcon: { color: colors.tealDark, fontSize: 34, fontWeight: '800' },
  imagePlaceholderText: { color: colors.muted, textAlign: 'center', lineHeight: 18, marginTop: 8, fontSize: 12 },
  imageActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  imageActionButton: { backgroundColor: '#E5F2F1', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13 },
  imageActionText: { color: colors.tealDark, fontWeight: '900', fontSize: 12 },
  imageRemoveButton: { backgroundColor: '#FCE8E6', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 13 },
  imageRemoveText: { color: colors.red, fontWeight: '900', fontSize: 12 },
  locationCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: colors.line, padding: 15, marginBottom: 14 },
  coords: { color: colors.ink, fontWeight: '800' },
  link: { color: colors.teal, fontWeight: '900', marginTop: 8 },
  noticeBox: { backgroundColor: '#EEF4F5', borderRadius: 14, padding: 14, marginVertical: 10 },
  noticeTitle: { color: colors.ink, fontWeight: '900', fontSize: 13 },
  noticeText: { color: colors.muted, lineHeight: 18, fontSize: 12, marginTop: 4 },
  meta: { color: '#87959D', fontSize: 11, marginTop: 10 },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 10, paddingHorizontal: 6, minHeight: 82 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 64, paddingVertical: 6, paddingHorizontal: 2 },
  tabIcon: { color: '#89979E', fontSize: 28, lineHeight: 31, fontWeight: '900' },
  tabText: { color: '#89979E', fontSize: 11, fontWeight: '800', marginTop: 3 },
  tabActive: { color: colors.tealDark },
  locateButton: { position: 'absolute', right: 16, bottom: 76, width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  locateText: { color: colors.tealDark, fontSize: 22, fontWeight: '900' },
  agentInput: { minHeight: 90 },
  agentActions: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  privacyChoiceRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  privacyChoice: { flex: 1, borderWidth: 1, borderColor: colors.line, backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13, minHeight: 98 },
  privacyChoiceActive: { borderColor: colors.teal, backgroundColor: '#E5F2F1' },
  privacyChoiceTitle: { color: colors.ink, fontWeight: '900', fontSize: 14 },
  privacyChoiceTitleActive: { color: colors.tealDark },
  privacyChoiceText: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 5 },
  privacyChoiceTextActive: { color: '#315E60' },
  frequencyLegend: { backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 11 },
  frequencyLegendTitle: { color: colors.ink, fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 8 },
  frequencyLegendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: '#FFFFFF' },
  legendText: { color: '#465A65', fontSize: 10, fontWeight: '800' },
  frequencyLegendNote: { color: '#788991', fontSize: 9, lineHeight: 13, marginTop: 7 },
});
