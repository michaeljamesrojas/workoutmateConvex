import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Authenticate a user with username and password.
 * For a minimal example, we'll just check if the username exists and create it if not.
 * In a real application, you would add proper password hashing and validation.
 */
export const login = mutation({
  args: {
    username: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    username: v.string(),
  }),
  handler: async (ctx, args) => {
    // Look for an existing user with this username
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    // If user exists, return the user
    if (existingUser) {
      return {
        userId: existingUser._id,
        username: existingUser.username,
      };
    }

    // If user doesn't exist, create a new user
    const userId = await ctx.db.insert("users", {
      username: args.username,
      createdAt: Date.now(),
    });

    return {
      userId,
      username: args.username,
    };
  },
});

/**
 * Get the current user if logged in
 */
export const getUser = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      username: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    if (!args.userId) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    return {
      userId: user._id,
      username: user.username,
    };
  },
});
