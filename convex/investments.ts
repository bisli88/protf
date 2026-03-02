import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getPortfolio = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const investments = await ctx.db
      .query("investments")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const exchangeRate = await ctx.db
      .query("exchangeRates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      investments,
      exchangeRate: exchangeRate?.usdToIls || 3.7, // Default rate
      lastUpdated: exchangeRate?.lastUpdated || Date.now(),
    };
  },
});

export const addInvestment = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    currency: v.union(v.literal("ILS"), v.literal("USD")),
    category: v.union(
      v.literal("Israel"),
      v.literal("Abroad"),
      v.literal("Long-Term"),
      v.literal("Short-Term")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    await ctx.db.insert("investments", {
      userId,
      name: args.name,
      amount: args.amount,
      currency: args.currency,
      category: args.category,
    });
  },
});

export const updateInvestment = mutation({
  args: {
    investmentId: v.id("investments"),
    name: v.string(),
    amount: v.number(),
    currency: v.union(v.literal("ILS"), v.literal("USD")),
    category: v.union(
      v.literal("Israel"),
      v.literal("Abroad"),
      v.literal("Long-Term"),
      v.literal("Short-Term")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const investment = await ctx.db.get(args.investmentId);
    if (!investment || investment.userId !== userId) {
      throw new Error("Investment not found or unauthorized");
    }

    await ctx.db.patch(args.investmentId, {
      name: args.name,
      amount: args.amount,
      currency: args.currency,
      category: args.category,
    });
  },
});

export const updateExchangeRate = mutation({
  args: {
    usdToIls: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("exchangeRates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        usdToIls: args.usdToIls,
        lastUpdated: Date.now(),
      });
    } else {
      await ctx.db.insert("exchangeRates", {
        userId,
        usdToIls: args.usdToIls,
        lastUpdated: Date.now(),
      });
    }
  },
});

export const deleteInvestment = mutation({
  args: {
    investmentId: v.id("investments"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const investment = await ctx.db.get(args.investmentId);
    if (!investment || investment.userId !== userId) {
      throw new Error("Investment not found or unauthorized");
    }

    await ctx.db.delete(args.investmentId);
  },
});
