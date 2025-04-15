import { useEffect } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function useNotificationPolling() {
  const pollNotifications = useMutation(api.sessionNotifications.pollSessionNotifications);

  useEffect(() => {
    // Initial poll
    pollNotifications();

    // Set up polling interval (every minute)
    const interval = setInterval(() => {
      pollNotifications();
    }, 60000); // Poll every minute

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [pollNotifications]);
}
