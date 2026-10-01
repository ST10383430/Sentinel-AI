/**
 * Notification bridge for the Expo Go build.
 *
 * Sentinel always records alerts in its in-app notification feed. We intentionally
 * do not import expo-notifications in Expo Go because some Android Expo Go runtimes
 * enter the remote-push code path at module load and crash with the SDK 53+ push
 * notification restriction.
 *
 * When Sentinel moves to a custom development/production build, this module can be
 * replaced with the native expo-notifications implementation.
 */
export async function pushLocalNotification(_title: string, _body: string): Promise<void> {
  // No-op in the Expo Go build. The alert is still added to Sentinel's in-app feed.
  return;
}
