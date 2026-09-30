import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function EmergencyButton({
  loading,
  onPress,
}: {
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={loading}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.18)' }}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel="Activate emergency panic mode"
    >
      <View style={styles.iconCircle}><Text style={styles.icon}>!</Text></View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>PANIC BUTTON</Text>
        <Text style={styles.title}>{loading ? 'ACTIVATING…' : 'PRESS FOR EMERGENCY'}</Text>
        <Text style={styles.subtitle}>Captures location, starts emergency audio and prepares contact actions.</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B3261E',
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 7,
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { color: '#B3261E', fontSize: 38, fontWeight: '900', lineHeight: 42 },
  copy: { flex: 1 },
  kicker: { color: '#FFDAD6', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#FFE8E6', marginTop: 5, fontSize: 11, lineHeight: 15 },
});
