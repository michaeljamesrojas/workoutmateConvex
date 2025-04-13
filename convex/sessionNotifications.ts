import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Constants
const EARLY_JOIN_MINUTES = 10; // Same as in the app

// Helper function that contains the notification logic
async function createJoinableSessionNotifications(ctx: any) {
  // Get the current time
  const now = new Date();
  
  // Calculate the time window for early join (now to 10 minutes from now)
  // We only want to notify about sessions that have JUST become joinable
  const earlyJoinWindowStart = now.getTime();
  const earlyJoinWindowEnd = now.getTime() + 1 * 60 * 1000; // 1 minute window to avoid duplicates
  
  // Time threshold for early join (10 minutes before start)
  const earlyJoinThreshold = EARLY_JOIN_MINUTES * 60 * 1000;
  
  // Get all upcoming sessions
  const allSessions = await ctx.db.query("events").collect();
  const notificationsToSend = [];
  
  // Check each session
  for (const session of allSessions) {
    const startTime = new Date(session.start).getTime();
    
    // Calculate time until session starts
    const timeUntilStart = startTime - now.getTime();
    
    // Check if the session is about to become joinable (between 10-11 minutes before start)
    // This ensures we only notify when it first becomes joinable
    if (
      timeUntilStart > 0 && // Future session
      timeUntilStart <= earlyJoinThreshold + earlyJoinWindowEnd && // Within the notification window (up to 11 min before)
      timeUntilStart >= earlyJoinThreshold - earlyJoinWindowStart // Just became joinable (10 min before)
    ) {
      // Check if we already sent this notification
      const existingNotifications = await ctx.db
        .query("notifications")
        .withIndex("by_eventId", (q: any) => q.eq("eventId", session._id))
        .filter((q: any) => q.eq(q.field("type"), "session_start"))
        .collect();
      
      // Only send if no previous notification exists
      if (existingNotifications.length === 0) {
        // Create notification for the session creator
        const notification = {
          userId: session.userId,
          type: "session_start" as const,
          content: `Your session "${session.title}" is now available for early joining (starts in ${Math.floor(timeUntilStart / 60000)} minutes)`,
          eventId: session._id,
          isRead: false,
          createdAt: Date.now(),
        };
        
        notificationsToSend.push(notification);
      }
    }
  }
  
  // Create all notifications
  for (const notification of notificationsToSend) {
    await ctx.db.insert("notifications", notification);
  }
  
  return { notificationsSent: notificationsToSend.length };
}

// Backend mutation that clients can periodically call to check for joinable sessions
export const pollSessionNotifications = mutation({
  args: {},
  handler: async (ctx) => {
    return await createJoinableSessionNotifications(ctx);
  },
});
