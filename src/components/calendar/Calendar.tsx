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
}

export const Calendar = ({ userId, username }: CalendarProps) => {
  // Since ProtectedRoute ensures we always have a username, we can safely assert it's non-null
  const userDisplayName = username as string;
  const currentUserId = userId as string;

  // Use Convex to manage events
  const createEvent = useMutation(api.events.create);
  const userEvents =
    useQuery(api.events.getByUserId, { userId: currentUserId }) || [];

  // Transform Convex events to the format FullCalendar expects
  const events = userEvents.map((event: any) => ({
    id: event._id,
    title: event.title,
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
  const calendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: "timeGridWeek",
    weekends: true,
    events: events,
    height: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    },
    editable: true,
    selectable: true,
    dateClick: handleDateClick,
    nowIndicator: true,
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
