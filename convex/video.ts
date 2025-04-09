import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Send a WebRTC signaling message (offer, answer, or candidate)
 * to a specific user within a session.
 */
export const sendSignal = mutation({
  args: {
    sessionId: v.string(),
    targetUserId: v.string(),
    type: v.union(
      v.literal("offer"),
      v.literal("answer"),
      v.literal("candidate")
    ),
    signal: v.string(),
  },
  handler: async (ctx, { sessionId, targetUserId, type, signal }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User must be authenticated to send signals.");
    }
    const senderUserId = identity.subject; // Get user ID from identity

    // Basic validation (could add checks if users are part of the session)
    if (senderUserId === targetUserId) {
      console.warn("Attempting to send signal to self");
      // Usually, you don't send signals to yourself, but might depend on logic
      // Decide if this should be an error or just logged
    }

    await ctx.db.insert("videoSignals", {
      sessionId,
      userId: senderUserId, // Use the authenticated user's ID as the sender
      targetUserId,
      type,
      signal,
    });

    console.log(`Signal sent: ${type} from ${senderUserId} to ${targetUserId} in session ${sessionId}`);
  },
});

/**
 * Query for WebRTC signaling messages directed at the current user
 * within a specific session.
 */
export const getSignals = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, { sessionId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Return empty array or throw error if user not authenticated?
      // Returning empty might be safer for client-side logic.
      console.warn("Unauthenticated user attempting to get signals.")
      return [];
    }
    const currentUserId = identity.subject; // Get user ID from identity

    // Fetch signals where the targetUserId matches the current authenticated user's ID
    const signals = await ctx.db
      .query("videoSignals")
      .withIndex("by_session_and_targetUser", (q) =>
        q.eq("sessionId", sessionId).eq("targetUserId", currentUserId)
      )
      .collect();

    return signals;
  },
});

/**
 * Mutation to delete signals once they have been processed by the recipient.
 * This prevents reprocessing old signals.
 */
export const deleteSignal = mutation({
    args: { signalId: v.id("videoSignals") },
    handler: async (ctx, { signalId }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("User must be authenticated to delete signals.");
        }
        const currentUserId = identity.subject;

        // Optional: Verify the user is the targetUserId of the signal before deleting?
        // This adds security but might be overkill if only the recipient queries/processes signals.
        // const signal = await ctx.db.get(signalId);
        // if (signal && signal.targetUserId !== currentUserId) {
        //     throw new Error("User cannot delete a signal not targeted at them.");
        // }

        await ctx.db.delete(signalId);
        console.log(`Signal ${signalId} deleted by user ${currentUserId}`);
    }
});
