import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Create a new notification
export const create = mutation({
  args: {
    userId: v.string(),
    type: v.union(
      v.literal("session_join"),
      v.literal("session_start"),
      v.literal("session_reminder")
    ),
    content: v.string(),
    eventId: v.optional(v.id("events")),
    fromUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      content: args.content,
      eventId: args.eventId,
      fromUserId: args.fromUserId,
      isRead: false,
      createdAt: Date.now(),
    });
    
    console.log(`Created notification ${notificationId} for user ${args.userId}`);
    return notificationId;
  },
});

// Get all unread notifications for a user
export const getUnreadForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_read", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .order("desc")
      .collect();
  },
});

// Get all notifications for a user
export const getAllForUser = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Mark a notification as read
export const markAsRead = mutation({
  args: {
    id: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.id);
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    await ctx.db.patch(args.id, { isRead: true });
    return args.id;
  },
});

// Mark all notifications as read for a user
export const markAllAsRead = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_read", (q) => 
        q.eq("userId", args.userId).eq("isRead", false)
      )
      .collect();
    
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, { isRead: true });
    }
    
    return notifications.length;
  },
});
