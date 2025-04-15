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

        // Fetch the signal document first
        const signal = await ctx.db.get(signalId);

        // Only attempt deletion if the signal exists
        if (signal !== null) {
            // Optional: You could re-add the check here if needed:
            // if (signal.targetUserId !== currentUserId) {
            //     console.warn(`User ${currentUserId} attempted to delete signal ${signalId} not targeted at them.`);
            //     // Decide whether to throw an error or just log and exit
            //     return; 
            // }
            
            await ctx.db.delete(signalId);
            console.log(`Signal ${signalId} deleted by user ${currentUserId}`);
        } else {
            console.log(`Signal ${signalId} not found, likely already deleted.`);
        }
    }
});

/**
 * Remove a user from a session (video call) and clean up their signals.
 */
export const leaveSession = mutation({
  args: {
    sessionId: v.id("events"), // Use Convex ID type for session/event
    userId: v.string(),
  },
  handler: async (ctx, { sessionId, userId }) => {
    // Remove user from participantIds in the session/event document
    const session = await ctx.db.get(sessionId);
    if (session && Array.isArray(session.participantIds)) {
      const newList = session.participantIds.filter((id) => id !== userId);
      await ctx.db.patch(sessionId, { participantIds: newList });
    }

    // Delete all signals sent by this user in this session
    const sentSignals = await ctx.db
      .query("videoSignals")
      .withIndex("by_session_and_user", q => q.eq("sessionId", sessionId).eq("userId", userId))
      .collect();
    // Delete all signals targeted to this user in this session
    const receivedSignals = await ctx.db
      .query("videoSignals")
      .withIndex("by_session_and_targetUser", q => q.eq("sessionId", sessionId).eq("targetUserId", userId))
      .collect();
    for (const signal of [...sentSignals, ...receivedSignals]) {
      await ctx.db.delete(signal._id);
    }
    console.log(`[leaveSession] User ${userId} removed from session ${sessionId} and signals cleaned up.`);
  },
});
