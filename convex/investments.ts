import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const ensureArray = (val: any) => {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") {
    return Object.entries(val).map(([name, percent]) => ({ 
      name, 
      percent: typeof percent === "number" ? percent : 0 
    }));
  }
  return [];
};

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

    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return {
      investments,
      exchangeRate: exchangeRate?.usdToIls || 3.7, // Default rate
      lastUpdated: exchangeRate?.lastUpdated || Date.now(),
      settings: settings ? {
        ...settings,
        idealIsraelPercent: settings.idealIsraelPercent ?? 40,
        abroadIdeals: ensureArray(settings.abroadIdeals),
        israelIdeals: ensureArray(settings.israelIdeals),
      } : { 
        idealIsraelPercent: 40, 
        abroadIdeals: [], 
        israelIdeals: [] 
      },
    };
  },
});

export const updateSettings = mutation({
  args: {
    idealIsraelPercent: v.optional(v.number()),
    abroadIdeals: v.optional(v.array(v.object({ name: v.string(), percent: v.number() }))),
    israelIdeals: v.optional(v.array(v.object({ name: v.string(), percent: v.number() }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      const updates: any = {};
      // Ensure existing data matches schema even if we don't update it explicitly
      // This fixes cases where old data was stored as objects but schema now expects arrays
      updates.abroadIdeals = ensureArray(existing.abroadIdeals);
      updates.israelIdeals = ensureArray(existing.israelIdeals);
      
      if (args.idealIsraelPercent !== undefined) updates.idealIsraelPercent = args.idealIsraelPercent;
      if (args.abroadIdeals !== undefined) updates.abroadIdeals = args.abroadIdeals;
      if (args.israelIdeals !== undefined) updates.israelIdeals = args.israelIdeals;
      
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        idealIsraelPercent: args.idealIsraelPercent ?? 40,
        abroadIdeals: args.abroadIdeals ?? [],
        israelIdeals: args.israelIdeals ?? [],
      });
    }
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
    excludeFromCalculator: v.optional(v.boolean()),
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
      excludeFromCalculator: args.excludeFromCalculator ?? false,
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
    excludeFromCalculator: v.optional(v.boolean()),
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
      excludeFromCalculator: args.excludeFromCalculator ?? false,
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
