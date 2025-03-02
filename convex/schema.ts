import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    user: v.string(),
    body: v.string(),
  }),

  users: defineTable({
    username: v.string(),
    password: v.string(),
    createdAt: v.number(),
  }).index("by_username", ["username"]),
});
