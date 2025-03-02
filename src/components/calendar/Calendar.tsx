import { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { Header } from "../layout";
import { useAuth } from "../../contexts/AuthContext";
import styles from "./Calendar.module.css";

interface CalendarProps {
  userId: string | null;
  username: string | null;
}

export const Calendar = ({ userId, username }: CalendarProps) => {
  // Since ProtectedRoute ensures we always have a username, we can safely assert it's non-null
  const userDisplayName = username as string;
  
  // Sample initial events - in a real application, these would come from your Convex backend
  const [events] = useState([
    { title: 'Meeting', start: new Date().toISOString().split('T')[0] },
    { title: 'Workout', start: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
  ]);

  return (
    <div className={styles.calendarContainer}>
      <Header username={userDisplayName} />
      <main className={styles.calendar}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="timeGridWeek"
          weekends={true}
          events={events}
          height="auto"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
        />
      </main>
    </div>
  );
}; 