import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    user: v.string(),
    body: v.string(),
  }),

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
});
