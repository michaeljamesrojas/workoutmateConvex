import React, { useEffect, useState } from "react";
import styles from "./EventModal.module.css";
import { useQuery } from "convex/react";
import { api } from "../../convex";
import { showToast } from "../../utils/toast";

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
  onSubmit: (eventData: { title: string; start: string; end: string }) => Promise<void>;
  onDelete?: (eventId: any) => Promise<void>;
  dateStr: string;
  event: {
    id?: any; // Convex ID type
    title: string;
    start: string;
    end?: string;
    creatorName?: string;
  } | null;
  userId: string; // Add userId to props for checking user's events
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  dateStr,
  event,
  userId,
}) => {
  const [title, setTitle] = React.useState("");
  const [startDate, setStartDate] = React.useState(() =>
    getInitialDate(dateStr)
  );
  const [endDate, setEndDate] = React.useState(() =>
    getInitialDate(dateStr, true)
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [overlappingSession, setOverlappingSession] = useState<any | null>(null);

  // Get user's existing events to check for overlaps
  const userEvents = useQuery(api.events.getByUserId, { userId }) || [];

  // Check for overlapping sessions
  useEffect(() => {
    if (!isOpen || !userId || !startDate || !endDate) return;

    try {
      const newStart = new Date(startDate).getTime();
      const newEnd = new Date(endDate).getTime();
      
      // Reset overlap state
      setOverlappingSession(null);

      // Check each existing event for overlap
      for (const existingEvent of userEvents) {
        // Skip the current event being edited
        if (event && existingEvent._id === event.id) continue;
        
        const existingStart = new Date(existingEvent.start).getTime();
        const existingEnd = existingEvent.end 
          ? new Date(existingEvent.end).getTime() 
          : existingStart + 60 * 60 * 1000; // Default to 1 hour if no end time
        
        // Check for overlap
        const overlap = (newStart >= existingStart && newStart < existingEnd) || 
                        (newEnd > existingStart && newEnd <= existingEnd) ||
                        (newStart <= existingStart && newEnd >= existingEnd);
        
        if (overlap) {
          setOverlappingSession(existingEvent);
          break;
        }
      }
    } catch (error) {
      console.error("Error checking for overlapping sessions:", error);
    }
  }, [isOpen, userEvents, startDate, endDate, userId, event]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setOverlappingSession(null);
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
      setError(null);
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      console.log("EventModal - Form Submission:", {
        title,
        start,
        end,
        now,
        isPastDate: start < now
      });

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error("EventModal - Invalid date format detected");
        const errorMsg = "Invalid date format. Please check your input.";
        setError(errorMsg);
        showToast.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Check if start date is in the past
      if (start < now) {
        console.log("EventModal - Rejected: Past date detected");
        setError("Cannot create session with a past date. Please select a future date.");
        showToast.session.pastDateError();
        return;
      }

      // Check for overlapping sessions
      if (overlappingSession) {
        console.log("EventModal - Rejected: Overlapping session detected", overlappingSession);
        const errorMsg = `This session overlaps with your existing session "${overlappingSession.title}"`;
        setError(errorMsg);
        showToast.session.overlapError();
        return;
      }

      console.log("EventModal - Submitting form:", {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        isEdit: !!event
      });

      const eventData = {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
      };

      // We need to use a Promise for async handling
      onSubmit(eventData)
        .then(() => {
          setTitle("");
          onClose();
          console.log("EventModal - Form submitted successfully");
          // Toast notifications are handled in the Calendar component
        })
        .catch((err: any) => {
          console.error("EventModal - Error from backend:", err);
          setError(err.message || "Failed to create/update session. Please try again.");
          // Toast notifications for backend errors are handled in the Calendar component
        });
    } catch (error: any) {
      console.error("EventModal - Error processing dates:", error);
      setError(error.message || "Invalid date format. Please check your input.");
    }
  };

  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;
    
    try {
      setIsDeleting(true);
      setError(null);
      console.log("EventModal - Deleting session:", event.id);
      
      await onDelete(event.id);
      console.log("EventModal - Session deleted successfully");
      
      onClose();
      // Toast notification handled in Calendar component
    } catch (error: any) {
      console.error("EventModal - Error deleting session:", error);
      const errorMsg = error.message || "Failed to delete session. Please try again.";
      setError(errorMsg);
      showToast.error(errorMsg);
      setIsDeleting(false);
    }
  };

  const handleDeleteConfirm = () => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      handleDelete();
    }
  };

  const isValidDateRange = new Date(startDate) < new Date(endDate);
  const now = new Date();
  const minDateTimeValue = formatDateForInput(now);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>{event ? "Edit Session" : "Create New Session"}</h2>
        {error && <div className={styles.errorMessage}>{error}</div>}
        {overlappingSession && (
          <div className={styles.warningMessage}>
            Warning: This session overlaps with your existing session "{overlappingSession.title}"
          </div>
        )}
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
              min={!event ? minDateTimeValue : undefined}
              required
            />
            {new Date(startDate) < now && !event && (
              <div className={styles.errorMessage}>
                Start time cannot be in the past
              </div>
            )}
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
            {event && onDelete && (
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className={styles.deleteButton}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Session"}
              </button>
            )}
            <div className={styles.rightButtons}>
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
                disabled={!title.trim() || !isValidDateRange || overlappingSession !== null}
              >
                {event ? "Update Session" : "Create Session"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
