import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex";
import styles from "./Notifications.module.css";

export function Notifications() {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  // Only fetch notifications if the user is signed in
  const userId = isLoaded && isSignedIn && user ? user.id : null;
  const notifications = useQuery(
    api.notifications.getUnreadForUser, 
    userId ? { userId } : "skip"
  ) || [];

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Handle clicking on a notification
  const handleNotificationClick = async (notificationId: any, eventId: any) => {
    // Mark as read
    if (notificationId) {
      await markAsRead({ id: notificationId });
    }
    
    // Navigate to the event if available
    if (eventId) {
      navigate(`/session/${eventId}`);
    }
    
    // Close the dropdown
    setIsDropdownOpen(false);
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    if (userId) {
      await markAllAsRead({ userId });
    }
  };

  // Format timestamp to relative time
  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // If not signed in or no notifications, show empty state
  if (!isLoaded || !isSignedIn || !notifications.length) {
    return (
      <div className={styles.notificationContainer}>
        <div 
          className={styles.notificationBell} 
          onClick={toggleDropdown}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor"/>
          </svg>
        </div>
        {isDropdownOpen && (
          <div className={styles.notificationDropdown} ref={dropdownRef}>
            <div className={styles.notificationHeader}>
              <h3>Notifications</h3>
            </div>
            <div className={styles.emptyNotifications}>
              No new notifications
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render with notifications
  return (
    <div className={styles.notificationContainer}>
      <div 
        className={`${styles.notificationBell} ${notifications.length > 0 ? styles.hasNotifications : ''}`} 
        onClick={toggleDropdown}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="currentColor"/>
        </svg>
        {notifications.length > 0 && (
          <span className={styles.notificationBadge}>
            {notifications.length > 99 ? '99+' : notifications.length}
          </span>
        )}
      </div>
      {isDropdownOpen && (
        <div className={styles.notificationDropdown} ref={dropdownRef}>
          <div className={styles.notificationHeader}>
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button 
                className={styles.markAllRead} 
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className={styles.notificationList}>
            {notifications.map((notification: any) => (
              <div 
                key={notification._id} 
                className={styles.notificationItem}
                onClick={() => handleNotificationClick(notification._id, notification.eventId)}
              >
                <div className={styles.notificationContent}>
                  {notification.content}
                </div>
                <div className={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
