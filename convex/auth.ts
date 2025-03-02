import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Simple hash function for passwords (in a production app, use bcrypt or similar)
// Convex doesn't support native bcrypt yet, so this is a simplified version
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Verify password against stored hash
async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

/**
 * Authenticate a user with username and password.
 */
export const login = mutation({
  args: {
    username: v.string(),
    password: v.string(),
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

    // If user exists, verify password
    if (existingUser) {
      // If the user was created before passwords were implemented, they may not have a password
      if (!existingUser.password) {
        // Update the user with a password
        const passwordHash = await hashPassword(args.password);
        await ctx.db.patch(existingUser._id, { password: passwordHash });
        return {
          userId: existingUser._id,
          username: existingUser.username,
        };
      }

      // Verify password
      const isPasswordValid = await verifyPassword(
        args.password,
        existingUser.password
      );
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }

      return {
        userId: existingUser._id,
        username: existingUser.username,
      };
    }

    // If user doesn't exist, create a new user with password
    const passwordHash = await hashPassword(args.password);
    const userId = await ctx.db.insert("users", {
      username: args.username,
      password: passwordHash,
      createdAt: Date.now(),
    });

    return {
      userId,
      username: args.username,
    };
  },
});

/**
 * Register a new user
 */
export const register = mutation({
  args: {
    username: v.string(),
    password: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    username: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check if username already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Create a new user
    const passwordHash = await hashPassword(args.password);
    const userId = await ctx.db.insert("users", {
      username: args.username,
      password: passwordHash,
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
