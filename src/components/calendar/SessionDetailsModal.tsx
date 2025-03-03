import React from "react";
import styles from "./SessionDetailsModal.module.css";

interface SessionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    title: string;
    start: string;
    end: string;
    creatorName: string;
  } | null;
  isOwnEvent?: boolean;
  onEdit?: () => void;
}

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  isOwnEvent = false,
  onEdit,
}) => {
  if (!isOpen || !event) return null;

  // Format dates for display
  const startDate = new Date(event.start).toLocaleString();
  const endDate = new Date(event.end).toLocaleString();

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Session Details</h2>
          <button onClick={onClose} className={styles.closeButton}>
            &times;
          </button>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.detailRow}>
            <strong>Title:</strong>
            <span>{event.title}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>Created by:</strong>
            <span>{event.creatorName}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>Start Time:</strong>
            <span>{startDate}</span>
          </div>
          <div className={styles.detailRow}>
            <strong>End Time:</strong>
            <span>{endDate}</span>
          </div>
        </div>
        {isOwnEvent && onEdit && (
          <div className={styles.modalFooter}>
            <button onClick={onEdit} className={styles.editButton}>
              Edit Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
