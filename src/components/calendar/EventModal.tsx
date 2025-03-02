import React from "react";
import styles from "./EventModal.module.css";

// Helper function to format date for datetime-local input
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper function to get initial date value
const getInitialDate = (dateStr: string, addHour = false): string => {
  try {
    // Handle both ISO string and FullCalendar's date string formats
    // FullCalendar format example: "2024-03-15T09:00:00"
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
      // If parsing fails, try parsing as a FullCalendar date string
      const [datePart, timePart] = dateStr.split("T");
      if (datePart && timePart) {
        const [year, month, day] = datePart.split("-").map(Number);
        const [hours, minutes] = timePart.split(":").map(Number);
        const newDate = new Date(year, month - 1, day, hours, minutes);
        if (!isNaN(newDate.getTime())) {
          if (addHour) {
            newDate.setHours(newDate.getHours() + 1);
          }
          return formatDateForInput(newDate);
        }
      }

      // If all parsing fails, use current time
      const now = new Date();
      if (addHour) {
        now.setHours(now.getHours() + 1);
      }
      return formatDateForInput(now);
    }

    if (addHour) {
      date.setHours(date.getHours() + 1);
    }
    return formatDateForInput(date);
  } catch {
    // Fallback to current time if any error occurs
    const now = new Date();
    if (addHour) {
      now.setHours(now.getHours() + 1);
    }
    return formatDateForInput(now);
  }
};

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: { title: string; start: string; end: string }) => void;
  dateStr: string;
  event: {
    id?: any; // Convex ID type
    title: string;
    start: string;
    end?: string;
    creatorName?: string;
  } | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  dateStr,
  event,
}) => {
  const [title, setTitle] = React.useState("");
  const [startDate, setStartDate] = React.useState(() =>
    getInitialDate(dateStr)
  );
  const [endDate, setEndDate] = React.useState(() =>
    getInitialDate(dateStr, true)
  );

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (event) {
        setTitle(event.title);
        setStartDate(getInitialDate(event.start));
        setEndDate(getInitialDate(event.end || event.start));
      } else {
        setTitle("");
        setStartDate(getInitialDate(dateStr));
        setEndDate(getInitialDate(dateStr, true));
      }
    }
  }, [dateStr, isOpen, event]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date");
      }

      onSubmit({
        title,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      setTitle("");
      onClose();
    } catch (error) {
      console.error("Error processing dates:", error);
      // You might want to show an error message to the user here
    }
  };

  const isValidDateRange = new Date(startDate) < new Date(endDate);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>{event ? "Edit Session" : "Create New Session"}</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="title">Session Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter session title"
              autoFocus
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="startDate">Start Date & Time</label>
            <input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="endDate">End Date & Time</label>
            <input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              required
            />
            {!isValidDateRange && (
              <div className={styles.errorMessage}>
                End time must be after start time
              </div>
            )}
          </div>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={!title.trim() || !isValidDateRange}
            >
              {event ? "Update Session" : "Create Session"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
