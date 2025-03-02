import React from "react";
import styles from "./CustomEvent.module.css";

interface CustomEventProps {
  event: {
    title: string;
    timeText: string;
  };
  isCurrentUser: boolean;
}

export const CustomEvent: React.FC<CustomEventProps> = ({
  event,
  isCurrentUser,
}) => {
  // Split the title to separate creator name and event title if present
  const [creatorName, ...titleParts] = event.title.split(": ");
  const eventTitle =
    titleParts.length > 0 ? titleParts.join(": ") : creatorName;

  return (
    <div
      className={`${styles.customEvent} ${isCurrentUser ? styles.currentUserEvent : ""}`}
    >
      <div className={styles.eventTime}>{event.timeText}</div>
      {titleParts.length > 0 && (
        <div className={styles.eventCreator}>{creatorName}</div>
      )}
      <div className={styles.eventTitle}>{eventTitle}</div>
    </div>
  );
};
