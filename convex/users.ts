import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get a user by their Auth ID (Clerk ID)
export const getUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    return user;
  },
});

// Update a user's avatar settings
export const updateUserAvatar = mutation({
  args: { 
    userId: v.string(),
    avatarId: v.string(),
    avatarColor: v.string(),
    storageId: v.optional(v.union(v.string(), v.null()))  // Make storageId optional and allow null
  },
  handler: async (ctx, args) => {
    // Find the user by userId (Auth ID/Clerk ID)
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    // If user doesn't exist, create a new user record
    if (!user) {
      const newUserId = await ctx.db.insert("users", {
        userId: args.userId,
        username: "User", // Default username
        createdAt: Date.now(),
        avatarId: args.avatarId,
        avatarColor: args.avatarColor,
        storageId: args.storageId ?? null // Explicitly set to null if not provided
      });
      return { success: true, userId: newUserId };
    }
    
    // Update the user's avatar settings
    const updateFields: any = {
      avatarId: args.avatarId,
      avatarColor: args.avatarColor,
      storageId: args.storageId ?? null // Explicitly set to null if not provided
    };
    
    // Update the user record
    await ctx.db.patch(user._id, updateFields);
    
    return { success: true, userId: user._id };
  },
});
