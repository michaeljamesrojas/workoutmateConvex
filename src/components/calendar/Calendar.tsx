import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";
import { Header } from "../layout";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Calendar.module.css";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex";
import { CalendarOptions } from "@fullcalendar/core";
import { CustomEvent } from "./CustomEvent";
import { EventModal } from "./EventModal";
import { SessionDetailsModal } from "./SessionDetailsModal";
import { Id } from "../../../convex/_generated/dataModel";
import { showToast } from "../../utils/toast";

interface CalendarProps {
  userId: string | null;
  username: string | null;
}

interface CalendarEvent {
  id: Id<"events">;
  title: string;
  start: string;
  end: string;
  creatorName: string;
}

export const Calendar = ({ userId, username }: CalendarProps) => {
  const userDisplayName = username as string;
  const currentUserId = userId as string;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [viewingEvent, setViewingEvent] = useState<CalendarEvent | null>(null);

  // Use Convex to manage events
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const deleteEvent = useMutation(api.events.deleteEvent);
  const allEvents = useQuery(api.events.getAllEvents) || [];

  // Transform Convex events to the format FullCalendar expects
  const events = allEvents.map((event: any) => ({
    id: event._id,
    creatorName: event.creatorName, // Keep the original creator name
    // Include creator name with the title, show "You" for current user's events
    title:
      event.creatorName === userDisplayName
        ? `You: ${event.title}`
        : event.creatorName && event.creatorName !== "Unknown User"
          ? `${event.creatorName}: ${event.title}`
          : event.title,
    start: event.start,
    end: event.end,
  }));

  // Handle date click - open modal for new event creation
  const handleDateClick = (info: DateClickArg) => {
    const clickedDate = new Date(info.dateStr);
    const now = new Date();
    
    // Check if the clicked date is in the past
    if (clickedDate < now) {
      console.log("Calendar - Rejected date click: Past date detected", info.dateStr);
      showToast.session.pastDateError();
      return; // Early return without opening the modal
    }
    
    // Only executed for future dates
    setSelectedEvent(null); // Clear any selected event
    setSelectedDate(info.dateStr);
    setIsModalOpen(true);
  };

  // Handle event click - show details modal for all events
  const handleEventClick = (info: any) => {
    const event = events.find((e) => e.id === info.event.id);
    if (!event) return;

    const [, ...titleParts] = event.title.split(": ");
    const eventTitle =
      titleParts.length > 0 ? titleParts.join(": ") : event.title;
    const eventData = {
      id: event.id,
      title: eventTitle,
      start: event.start,
      end: event.end,
      creatorName: event.creatorName,
    };

    setViewingEvent(eventData);
    setIsDetailsModalOpen(true);
  };

  // Handle direct edit click from the event
  const handleEventEditClick = (info: any) => {
    const event = events.find((e) => e.id === info.event.id);
    if (!event) return;

    const [, ...titleParts] = event.title.split(": ");
    const eventTitle =
      titleParts.length > 0 ? titleParts.join(": ") : event.title;
    const eventData = {
      id: event.id,
      title: eventTitle,
      start: event.start,
      end: event.end,
      creatorName: event.creatorName,
    };

    setSelectedEvent(eventData);
    setIsModalOpen(true);
  };

  // Handle switching from details to edit mode
  const handleEditEvent = () => {
    if (viewingEvent) {
      setSelectedEvent(viewingEvent);
      setIsDetailsModalOpen(false);
      setIsModalOpen(true);
    }
  };

  // Handle event deletion
  const handleEventDelete = async (eventId: Id<"events">) => {
    try {
      console.log("Calendar - Deleting event:", eventId);
      await deleteEvent({ id: eventId });
      console.log("Calendar - Event deleted successfully");
      showToast.session.deleted();
      return Promise.resolve();
    } catch (error: any) {
      console.error("Calendar - Error deleting event:", error);
      showToast.error(error.message || "Failed to delete session");
      return Promise.reject(error);
    }
  };

  // Handle event creation/update from modal
  const handleEventSubmit = async ({
    title,
    start,
    end,
  }: {
    title: string;
    start: string;
    end: string;
  }): Promise<void> => {
    try {
      console.log("Calendar - Submitting event:", {
        isEdit: !!selectedEvent?.id,
        title,
        start,
        end
      });

      if (selectedEvent?.id) {
        // Update existing event
        console.log("Calendar - Updating existing event:", selectedEvent.id);
        await updateEvent({
          id: selectedEvent.id,
          title,
          start,
          end,
        });
        console.log("Calendar - Event updated successfully");
        showToast.session.updated();
      } else if (userId) {
        // Create new event
        console.log("Calendar - Creating new event for user:", currentUserId);
        const eventId = await createEvent({
          userId: currentUserId,
          title,
          start,
          end,
        });
        console.log("Calendar - Event created successfully:", eventId);
        showToast.session.created();
      }
    } catch (error: any) {
      console.error("Calendar - Error submitting event:", error);
      if (error.message.includes("past date")) {
        showToast.session.pastDateError();
      } else if (error.message.includes("overlapping")) {
        showToast.session.overlapError();
      } else {
        showToast.error(error.message || "Failed to create/update session");
      }
      return Promise.reject(error);
    }
  };

  // Configure calendar options
  const calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: "timeGridWeek",
    weekends: true,
    events: events,
    height: "100%",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    editable: true,
    selectable: true,
    dateClick: handleDateClick,
    eventClick: handleEventClick,
    nowIndicator: true,
    scrollTime: "08:00:00",
    // Additional time slot configuration options
    slotDuration: "00:15:00", // 30-minute slots (default)
    slotLabelInterval: "01:00:00", // Show labels every hour
    slotMinTime: "00:00:00", // Start at midnight
    slotMaxTime: "24:00:00", // End at midnight
    eventContent: (arg) => {
      const timeText =
        arg.timeText ||
        new Date(arg.event.startStr).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      const event = events.find((e) => e.id === arg.event.id);
      const isCurrentUser = event?.creatorName === userDisplayName;
      return (
        <CustomEvent
          event={{ title: arg.event.title, timeText }}
          isCurrentUser={isCurrentUser}
          onEditClick={() => handleEventEditClick(arg)}
        />
      );
    },
  };

  return (
    <div className={styles.calendarContainer}>
      <Header username={userDisplayName} />
      <main className={styles.calendar}>
        <FullCalendar {...calendarOptions} />
      </main>
      <EventModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedEvent(null);
        }}
        onSubmit={handleEventSubmit}
        onDelete={selectedEvent?.creatorName === userDisplayName ? handleEventDelete : undefined}
        dateStr={selectedDate}
        event={selectedEvent}
        userId={currentUserId}
      />
      <SessionDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setViewingEvent(null);
        }}
        event={viewingEvent}
        isOwnEvent={viewingEvent?.creatorName === userDisplayName}
        onEdit={handleEditEvent}
      />
    </div>
  );
};
