import React from "react";
import styles from "./CustomEvent.module.css";

interface CustomEventProps {
  event: {
    title: string;
    timeText: string;
  };
  isCurrentUser: boolean;
  isEnded?: boolean;
  onEditClick?: (e: React.MouseEvent) => void;
}

export const CustomEvent: React.FC<CustomEventProps> = ({
  event,
  isCurrentUser,
  isEnded = false,
  onEditClick,
}) => {
  // Split the title to separate creator name and event title if present
  const [creatorName, ...titleParts] = event.title.split(": ");
  const eventTitle =
    titleParts.length > 0 ? titleParts.join(": ") : creatorName;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event click from triggering
    onEditClick?.(e);
  };

  return (
    <div
      className={`${styles.customEvent} ${isCurrentUser ? styles.currentUserEvent : ""} ${isEnded ? styles.endedEvent : ""}`}
    >
      <div className={styles.eventTime}>{event.timeText}</div>
      {titleParts.length > 0 && (
        <div className={styles.eventCreator}>{creatorName}</div>
      )}
      <div className={styles.eventTitle}>{eventTitle}</div>
      {isCurrentUser && (
        <button className={styles.editButton} onClick={handleEditClick}>
          <span>✎</span>
          <span>Edit</span>
        </button>
      )}
    </div>
  );
};
