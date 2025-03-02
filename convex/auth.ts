import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import bcrypt from "bcryptjs";

// We'll use synchronous versions of bcrypt functions to avoid setTimeout incompatibility
// These are slower but more compatible with Convex's limitations

// Password management using bcryptjs (synchronous version)
function hashPasswordSync(password: string): string {
  // Use 10 rounds (standard secure value)
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

// Verify password against stored hash (synchronous version)
function verifyPasswordSync(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
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
        const passwordHash = hashPasswordSync(args.password);
        await ctx.db.patch(existingUser._id, { password: passwordHash });
        return {
          userId: existingUser._id,
          username: existingUser.username,
        };
      }

      // Verify password
      const isPasswordValid = verifyPasswordSync(
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

    // If user doesn't exist, throw an error instead of creating a new account
    throw new Error("User not found. Please register first.");
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
    const passwordHash = hashPasswordSync(args.password);
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
