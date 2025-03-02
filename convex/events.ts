import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new event
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    start: v.string(),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      userId: args.userId,
      title: args.title,
      start: args.start,
      end: args.end,
      createdAt: Date.now(),
    });

    return eventId;
  },
});

// Get all events for a user
export const getByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Get all events from all users with creator username
export const getAllEvents = query({
  args: {},
  handler: async (ctx) => {
    // First, get all users and create a userId -> username map
    const allUsers = await ctx.db.query("users").collect();
    const userMap = new Map();

    // Create a map of user IDs to usernames
    allUsers.forEach((user) => {
      // Try adding both _id and clerkId to the map
      userMap.set(user._id, user.username);
      if (user.clerkId) {
        userMap.set(user.clerkId, user.username);
      }
    });

    // Get all events
    const events = await ctx.db.query("events").collect();

    // Add username to each event
    const eventsWithUserInfo = events.map((event) => {
      return {
        ...event,
        creatorName: userMap.get(event.userId) || "Unknown User",
      };
    });

    return eventsWithUserInfo;
  },
});
