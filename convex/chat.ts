import { internalAction, mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    user: v.string(),
    body: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("This TypeScript function is running on the server.");
    await ctx.db.insert("messages", {
      user: args.user,
      body: args.body,
      sessionId: args.sessionId,
    });
  },
});

export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").order("desc").take(50);

    return messages.reverse();
  },
});

export const getSessionMessages = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.sessionId) {
      return [];
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .take(100);

    return messages.reverse();
  },
});

// export const getWikipediaSummary = internalAction({
//   args: { topic: v.string() },
//   handler: async (ctx, args) => {
//     const response = await fetch(
//       "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=" +
//         args.topic,
//     );

//     return getSummaryFromJSON(await response.json());
//   },
// });

// function getSummaryFromJSON(data: any) {
//   const firstPageId = Object.keys(data.query.pages)[0];
//   return data.query.pages[firstPageId].extract;
// }
