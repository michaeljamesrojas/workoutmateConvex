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

  // Handle event creation/update from modal
  const handleEventSubmit = async ({
    title,
    start,
    end,
  }: {
    title: string;
    start: string;
    end: string;
  }) => {
    if (selectedEvent?.id) {
      // Update existing event
      await updateEvent({
        id: selectedEvent.id,
        title,
        start,
        end,
      });
    } else if (userId) {
      // Create new event
      await createEvent({
        userId: currentUserId,
        title,
        start,
        end,
      });
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
        dateStr={selectedDate}
        event={selectedEvent}
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
