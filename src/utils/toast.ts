import toast from 'react-hot-toast';

// Define toast notification types
export const showToast = {
  /**
   * Show a success toast notification
   */
  success: (message: string) => {
    toast.success(message, {
      icon: '🎉',
    });
    console.log(`Success: ${message}`); // For debugging
  },

  /**
   * Show an error toast notification
   */
  error: (message: string) => {
    toast.error(message, {
      icon: '❌',
    });
    console.error(`Error: ${message}`); // For debugging
  },

  /**
   * Show an informational toast notification
   */
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
    });
    console.info(`Info: ${message}`); // For debugging
  },

  /**
   * Show a warning toast notification
   */
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      style: {
        background: '#f59e0b',
        color: '#fff',
      },
    });
    console.warn(`Warning: ${message}`); // For debugging
  },

  /**
   * Show a toast notification for session events
   */
  session: {
    created: () => showToast.success('Session created successfully!'),
    updated: () => showToast.success('Session updated successfully!'),
    deleted: () => showToast.success('Session deleted successfully!'),
    pastDateError: () => showToast.error('Cannot create session in the past. Please select a future date.'),
    overlapError: () => showToast.error('Cannot create overlapping sessions. You already have a session scheduled during this time.'),
    joined: () => showToast.success('Joined session successfully!'),
    earlyJoin: (minutesEarly: number) => showToast.info(`You've joined the session ${minutesEarly} minutes early!`),
  }
}; 