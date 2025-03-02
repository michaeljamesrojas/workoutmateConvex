import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Define UserData interface for type safety
export interface UserData {
  _id: Id<"users">;
  username: string;
  password?: string;
  createdAt: number;
}

// Internal helper functions for authentication
export const findUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args): Promise<UserData | null> => {
    return ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

export const updateUserPassword = mutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    await ctx.db.patch(args.userId, { password: args.passwordHash });
    return args.userId;
  },
});

export const createUser = mutation({
  args: {
    username: v.string(),
    passwordHash: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"users">> => {
    return ctx.db.insert("users", {
      username: args.username,
      password: args.passwordHash,
      createdAt: Date.now(),
    });
  },
});
