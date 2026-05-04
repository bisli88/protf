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

const DEFAULT_CATEGORIES = [
  { name: "Israel", defaultCurrency: "ILS" as const, includeInStrategy: true, iconName: "TrendingUp", color: "blue" },
  { name: "Abroad", defaultCurrency: "USD" as const, includeInStrategy: true, iconName: "Globe", color: "emerald" },
  { name: "Long-Term", defaultCurrency: "ILS" as const, includeInStrategy: false, iconName: "History", color: "purple" },
  { name: "Short-Term", defaultCurrency: "ILS" as const, includeInStrategy: false, iconName: "Clock", color: "orange" },
];

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

    const categories = await ctx.db
      .query("categories")
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
      categories,
      exchangeRate: exchangeRate?.usdToIls || 3.7, // Default rate
      lastUpdated: exchangeRate?.lastUpdated || Date.now(),
      settings: settings ? {
        ...settings,
        strategyWeights: settings.strategyWeights || {},
        investmentWeights: settings.investmentWeights || {},
        idealIsraelPercent: settings.idealIsraelPercent ?? 40,
        abroadIdeals: ensureArray(settings.abroadIdeals),
        israelIdeals: ensureArray(settings.israelIdeals),
        customCharts: settings.customCharts || [],
      } : { 
        strategyWeights: {},
        investmentWeights: {},
        idealIsraelPercent: 40, 
        abroadIdeals: [], 
        israelIdeals: [],
        customCharts: [],
      },
    };
  },
});

export const seedCategories = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length === 0) {
      for (const cat of DEFAULT_CATEGORIES) {
        await ctx.db.insert("categories", {
          userId,
          ...cat,
        });
      }
    }
  }
});

export const addCategory = mutation({
  args: {
    name: v.string(),
    defaultCurrency: v.union(v.literal("ILS"), v.literal("USD")),
    includeInStrategy: v.boolean(),
    iconName: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await ctx.db.insert("categories", { userId, ...args });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    defaultCurrency: v.union(v.literal("ILS"), v.literal("USD")),
    includeInStrategy: v.boolean(),
    iconName: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing || existing.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, updates);
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.id);
  },
});

export const updateSettings = mutation({
  args: {
    strategyWeights: v.optional(v.any()),
    investmentWeights: v.optional(v.any()),
    idealIsraelPercent: v.optional(v.number()),
    abroadIdeals: v.optional(v.array(v.object({ name: v.string(), percent: v.number() }))),
    israelIdeals: v.optional(v.array(v.object({ name: v.string(), percent: v.number() }))),
    customCharts: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      type: v.union(v.literal("categories"), v.literal("single-category")),
      selectedCategories: v.array(v.string()),
    }))),
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

    const updates: any = {};
    if (args.strategyWeights !== undefined) updates.strategyWeights = args.strategyWeights;
    if (args.investmentWeights !== undefined) updates.investmentWeights = args.investmentWeights;
    if (args.idealIsraelPercent !== undefined) updates.idealIsraelPercent = args.idealIsraelPercent;
    if (args.abroadIdeals !== undefined) updates.abroadIdeals = args.abroadIdeals;
    if (args.israelIdeals !== undefined) updates.israelIdeals = args.israelIdeals;
    if (args.customCharts !== undefined) updates.customCharts = args.customCharts;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userSettings", {
        userId,
        strategyWeights: updates.strategyWeights || {},
        investmentWeights: updates.investmentWeights || {},
        idealIsraelPercent: updates.idealIsraelPercent ?? 40,
        abroadIdeals: updates.abroadIdeals ?? [],
        israelIdeals: updates.israelIdeals ?? [],
        customCharts: updates.customCharts ?? [],
      });
    }
  },
});

export const addInvestment = mutation({
  args: {
    name: v.string(),
    amount: v.number(),
    currency: v.union(v.literal("ILS"), v.literal("USD")),
    category: v.string(),
    excludeFromCalculator: v.optional(v.boolean()),
    initialAmount: v.optional(v.number()),
    ticker: v.optional(v.string()),
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
      initialAmount: args.initialAmount,
      excludeFromCalculator: args.excludeFromCalculator ?? false,
      ticker: args.ticker,
    });
  },
});

export const updateInvestment = mutation({
  args: {
    investmentId: v.id("investments"),
    name: v.string(),
    amount: v.number(),
    currency: v.union(v.literal("ILS"), v.literal("USD")),
    category: v.string(),
    initialAmount: v.optional(v.number()),
    excludeFromCalculator: v.optional(v.boolean()),
    ticker: v.optional(v.string()),
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
      initialAmount: args.initialAmount,
      excludeFromCalculator: args.excludeFromCalculator ?? false,
      ticker: args.ticker,
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
