import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    user: v.string(),
    body: v.string(),
    sessionId: v.optional(v.string()),
  }).index("by_sessionId", ["sessionId"]),

  users: defineTable({
    username: v.string(),
    password: v.optional(v.string()),
    createdAt: v.number(),
    clerkId: v.optional(v.string()),
  })
    .index("by_username", ["username"])
    .index("by_clerkId", ["clerkId"]),

  events: defineTable({
    userId: v.string(),
    title: v.string(),
    start: v.string(), // Store start time as ISO string
    end: v.optional(v.string()), // Store end time as ISO string, optional
    createdAt: v.number(),
    participantIds: v.optional(v.array(v.string())), // Array of user IDs in the session
  })
    .index("by_userId", ["userId"])
    .index("by_userId_start", ["userId", "start"]),

  // New table for WebRTC signaling
  videoSignals: defineTable({
    sessionId: v.string(),      // ID of the session the signal belongs to
    userId: v.string(),         // ID of the user sending the signal
    targetUserId: v.string(),   // ID of the user the signal is intended for
    type: v.union(             // Type of signal
      v.literal("offer"),
      v.literal("answer"),
      v.literal("candidate")
    ),
    signal: v.string(),         // The signaling data (SDP offer/answer or ICE candidate)
  })
    .index("by_session_and_targetUser", ["sessionId", "targetUserId"])
    .index("by_session_and_user", ["sessionId", "userId"]),

  // Notifications table for user alerts and updates
  notifications: defineTable({
    userId: v.string(),         // ID of the user to notify
    type: v.union(             // Type of notification
      v.literal("session_join"),
      v.literal("session_start"),
      v.literal("session_reminder")
    ),
    content: v.string(),        // Notification content/message
    eventId: v.optional(v.id("events")),  // Related event ID if applicable
    fromUserId: v.optional(v.string()),   // ID of the user who triggered the notification
    isRead: v.boolean(),        // Whether the notification has been read
    createdAt: v.number(),      // When the notification was created
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_read", ["userId", "isRead"])
    .index("by_eventId", ["eventId"]),
});
