/**
 * Expo Go-safe notification adapter.
 *
 * Android remote push notification support from expo-notifications is not
 * available in Expo Go on recent SDKs. Sentinel already maintains an in-app
 * Alerts feed in SentinelContext, so the Expo Go-compatible build uses that feed while
 * running in Expo Go and deliberately avoids importing expo-notifications at
 * runtime.
 *
 * For a later development build, this function can be replaced with a native
 * expo-notifications implementation without changing the rest of the app.
 */
export async function pushLocalNotification(title: string, body: string): Promise<void> {
  // Keep this async so existing callers do not need to change.
  // The visible notification is already added to Sentinel's in-app Alerts feed.
  if (__DEV__) {
    console.log(`[Sentinel notification] ${title}: ${body}`);
  }
}
