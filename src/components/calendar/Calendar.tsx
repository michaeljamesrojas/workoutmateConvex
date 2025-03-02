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

interface CalendarProps {
  userId: string | null;
  username: string | null;
}

// Define event interface following DDD
interface CalendarEvent {
  id?: string;
  title: string;
  start: string;
  end?: string;
  creatorName?: string;
}

export const Calendar = ({ userId, username }: CalendarProps) => {
  // Since ProtectedRoute ensures we always have a username, we can safely assert it's non-null
  const userDisplayName = username as string;
  const currentUserId = userId as string;

  // Use Convex to manage events
  const createEvent = useMutation(api.events.create);
  // Get all events rather than just the current user's events
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

  // Handle date click - create a new event when a time slot is clicked
  const handleDateClick = async (info: DateClickArg) => {
    const title = prompt("Enter event title:"); // Simple prompt for event title
    if (title && userId) {
      // Calculate end time (1 hour after start time)
      const startDate = new Date(info.date);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const newEvent = {
        userId: currentUserId,
        title,
        start: info.dateStr,
        end: endDate.toISOString(),
      };

      // Save the event to the Convex backend
      await createEvent(newEvent);
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
    </div>
  );
};
