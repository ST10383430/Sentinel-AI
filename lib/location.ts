import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

export async function getCurrentLocation(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Location permission was not granted.');
  }

  const result = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: result.coords.latitude,
    longitude: result.coords.longitude,
  };
}
