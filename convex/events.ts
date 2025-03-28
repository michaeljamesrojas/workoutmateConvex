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
    // Validate that the start date is not in the past
    const startDate = new Date(args.start);
    const currentDate = new Date();
    
    console.log("Create Session - Validation:", {
      startDate,
      currentDate,
      isPastDate: startDate < currentDate,
      userId: args.userId,
      title: args.title
    });
    
    if (startDate < currentDate) {
      console.log("Create Session - Rejected: Past date detected");
      throw new Error("Cannot create session with a past date. Please select a future date.");
    }

    // Check for overlapping sessions for the same user
    const userEvents = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
    
    // Parse the new session's time range
    const newStart = new Date(args.start).getTime();
    const newEnd = args.end ? new Date(args.end).getTime() : newStart + 60 * 60 * 1000; // Default to 1 hour if no end provided
    
    // Check each existing event for overlap
    for (const event of userEvents) {
      const existingStart = new Date(event.start).getTime();
      const existingEnd = event.end ? new Date(event.end).getTime() : existingStart + 60 * 60 * 1000;
      
      // Check for overlap: 
      // New event starts during existing event OR 
      // New event ends during existing event OR
      // New event completely contains existing event
      const overlap = (newStart >= existingStart && newStart < existingEnd) || 
                      (newEnd > existingStart && newEnd <= existingEnd) ||
                      (newStart <= existingStart && newEnd >= existingEnd);
      
      if (overlap) {
        console.log("Create Session - Rejected: Overlapping session detected", {
          newSession: { start: args.start, end: args.end },
          existingSession: { start: event.start, end: event.end, title: event.title }
        });
        throw new Error("Cannot create overlapping sessions. You already have a session scheduled during this time.");
      }
    }

    const eventId = await ctx.db.insert("events", {
      userId: args.userId,
      title: args.title,
      start: args.start,
      end: args.end,
      createdAt: Date.now(),
    });
    
    console.log("Create Session - Success:", {
      eventId,
      title: args.title,
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

// Update an existing event
export const update = mutation({
  args: {
    id: v.id("events"),
    title: v.string(),
    start: v.string(),
    end: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) {
      console.log("Update Session - Failed: Event not found", args.id);
      throw new Error("Event not found");
    }

    // Validate that the start date is not in the past
    const startDate = new Date(args.start);
    const currentDate = new Date();
    
    console.log("Update Session - Validation:", {
      eventId: args.id,
      startDate,
      currentDate,
      isPastDate: startDate < currentDate,
      title: args.title
    });
    
    if (startDate < currentDate) {
      console.log("Update Session - Rejected: Past date detected");
      throw new Error("Cannot update session to a past date. Please select a future date.");
    }

    // Check for overlapping sessions for the same user
    const userEvents = await ctx.db
      .query("events")
      .withIndex("by_userId", (q) => q.eq("userId", event.userId))
      .collect();
    
    // Parse the updated session's time range
    const newStart = new Date(args.start).getTime();
    const newEnd = args.end ? new Date(args.end).getTime() : newStart + 60 * 60 * 1000;
    
    // Check each existing event for overlap
    for (const existingEvent of userEvents) {
      // Skip checking against the event being updated
      if (existingEvent._id === args.id) continue;
      
      const existingStart = new Date(existingEvent.start).getTime();
      const existingEnd = existingEvent.end ? new Date(existingEvent.end).getTime() : existingStart + 60 * 60 * 1000;
      
      // Check for overlap
      const overlap = (newStart >= existingStart && newStart < existingEnd) || 
                      (newEnd > existingStart && newEnd <= existingEnd) ||
                      (newStart <= existingStart && newEnd >= existingEnd);
      
      if (overlap) {
        console.log("Update Session - Rejected: Overlapping session detected", {
          updatedSession: { id: args.id, start: args.start, end: args.end },
          existingSession: { id: existingEvent._id, start: existingEvent.start, end: existingEvent.end, title: existingEvent.title }
        });
        throw new Error("Cannot create overlapping sessions. You already have a session scheduled during this time.");
      }
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      start: args.start,
      end: args.end,
    });
    
    console.log("Update Session - Success:", {
      eventId: args.id,
      title: args.title,
    });

    return args.id;
  },
});

// Get a single event by ID
export const getEventById = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.id) {
      console.log("getEventById - No ID provided");
      return null;
    }

    try {
      // First, get all users and create a userId -> username map
      const allUsers = await ctx.db.query("users").collect();
      const userMap = new Map();

      // Create a map of user IDs to usernames
      allUsers.forEach((user) => {
        userMap.set(user._id, user.username);
        if (user.clerkId) {
          userMap.set(user.clerkId, user.username);
        }
      });

      // Get the event by ID
      try {
        const eventId = args.id as any; // Convert to any to avoid type issues
        const event = await ctx.db.get(eventId);

        if (!event) {
          console.log("getEventById - Event not found", eventId);
          return null;
        }

        // Check if it's actually an event (has userId field)
        if ("userId" in event) {
          // Log session timing information for debugging
          const now = new Date();
          const startTime = new Date(event.start);
          const endTime = new Date(event.end || event.start);
          const timeUntilStart = startTime.getTime() - now.getTime();
          
          // Early join threshold - 10 minutes
          const earlyJoinThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
          const canEarlyJoin = timeUntilStart > 0 && timeUntilStart <= earlyJoinThreshold;
          
          console.log("Session timing info:", {
            eventId: event._id,
            title: event.title,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            currentTime: now.toISOString(),
            timeUntilStart,
            minutesUntilStart: Math.ceil(timeUntilStart / (1000 * 60)),
            isActive: now >= startTime && now <= endTime,
            canEarlyJoin,
            isPast: now > endTime
          });

          // Add creator name to the event
          return {
            ...event,
            creatorName: userMap.get(event.userId) || "Unknown User",
          };
        }

        return null;
      } catch (error) {
        console.error("Error getting event:", error);
        return null;
      }
    } catch (error) {
      console.error("Error fetching event by ID:", error);
      return null;
    }
  },
});

// Delete an event by ID
export const deleteEvent = mutation({
  args: {
    id: v.id("events"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.id);
    if (!event) {
      console.log("Delete Event - Failed: Event not found", args.id);
      throw new Error("Event not found");
    }

    console.log("Delete Event - Deleting:", {
      eventId: args.id,
      title: event.title,
    });

    await ctx.db.delete(args.id);
    
    console.log("Delete Event - Success: Event deleted", args.id);
    return args.id;
  },
});
