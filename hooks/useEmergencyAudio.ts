import { useCallback, useState } from 'react';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

/**
 * Emergency audio capture. Recording only starts after the user activates
 * Sentinel's panic flow and grants microphone permission. A visible recording
 * state is always shown in the UI; Sentinel does not perform hidden listening.
 */
export function useEmergencyAudio() {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, directory: 'document' });
  const recorderState = useAudioRecorderState(recorder);
  const [lastRecordingUri, setLastRecordingUri] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission is required to capture emergency audio.');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording) return lastRecordingUri;
    await recorder.stop();
    const uri = recorder.uri ?? null;
    setLastRecordingUri(uri);
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    return uri;
  }, [lastRecordingUri, recorder, recorderState.isRecording]);

  return {
    isRecording: recorderState.isRecording,
    startRecording,
    stopRecording,
    lastRecordingUri,
  };
}
