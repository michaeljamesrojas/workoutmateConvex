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
    start: v.string(),
    end: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_userId", ["userId"]),

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
});
