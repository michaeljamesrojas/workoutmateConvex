import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Header } from "../layout";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Calendar.module.css";

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

  // Sample initial events - in a real application, these would come from your Convex backend
  const [events, setEvents] = useState<CalendarEvent[]>([
    { title: "Meeting", start: new Date().toISOString().split("T")[0] },
    {
      title: "Workout",
      start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    },
  ]);

  // Handle date click - create a new event when a time slot is clicked
  const handleDateClick = (info: any) => {
    const title = prompt("Enter event title:"); // Simple prompt for event title
    if (title) {
      const newEvent: CalendarEvent = {
        title,
        start: info.dateStr,
      };

      setEvents([...events, newEvent]);

      // In a real app, you would save this to your Convex backend
      // Example: mutation.events.create({ title, start: info.dateStr, userId })
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
