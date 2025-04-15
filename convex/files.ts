import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Generate a pre-signed URL for uploading a profile image
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Generate upload URL using the correct API
    return await ctx.storage.generateUploadUrl();
  },
});

// Store a file that has been uploaded
export const storeFileId = mutation({
  args: { 
    storageId: v.string(),
    userId: v.string()
  },
  handler: async (ctx, args) => {
    // Find the user by userId (checking both fields that might contain clerk ID)
    const userByUserId = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
      
    const userByClerkId = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .first();
    
    // Use whichever user record we found
    const user = userByUserId || userByClerkId;
    
    if (!user) {
      console.error("User not found with userId:", args.userId);
      // Create a new user record if one doesn't exist
      const userId = await ctx.db.insert("users", {
        userId: args.userId,
        clerkId: args.userId,
        username: "User",
        createdAt: Date.now(),
        avatarId: "custom",
        storageId: args.storageId
      });
      return { success: true, created: true };
    }
    
    // Update the user's avatar with the storage ID
    await ctx.db.patch(user._id, {
      avatarId: 'custom',
      storageId: args.storageId
    });
    
    return { success: true };
  },
});

// Get a profile image for a specific user
export const getUserProfileImage = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
      
    if (!user || !user.storageId) {
      return null;
    }
    
    try {
      // Get the URL for the stored image
      const url = await ctx.storage.getUrl(user.storageId as string);
      return { url, storageId: user.storageId };
    } catch (error) {
      console.error("Error getting profile image URL:", error);
      return null;
    }
  },
});
