import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  investments: defineTable({
    userId: v.id("users"),
    name: v.string(),
    amount: v.number(),
    initialAmount: v.optional(v.number()),
    currency: v.union(v.literal("ILS"), v.literal("USD")),
    category: v.string(),
    excludeFromCalculator: v.optional(v.boolean()),
    ticker: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    defaultCurrency: v.union(v.literal("ILS"), v.literal("USD")),
    includeInStrategy: v.boolean(),
    iconName: v.string(),
    color: v.string(),
  }).index("by_user", ["userId"]),

  exchangeRates: defineTable({
    userId: v.id("users"),
    usdToIls: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    strategyWeights: v.optional(v.any()),
    investmentWeights: v.optional(v.any()),
    customCharts: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      type: v.union(v.literal("categories"), v.literal("single-category")),
      selectedCategories: v.array(v.string()),
    }))),
    idealIsraelPercent: v.optional(v.number()),
    abroadIdeals: v.optional(v.any()),
    israelIdeals: v.optional(v.any()),
  }).index("by_user", ["userId"]),

  // ── NEW: Report Profiles ──
  reportProfiles: defineTable({
    userId: v.id("users"),
    name: v.string(), // e.g. "דו"ח לרואה חשבון"
    // Which investments to include (by _id string). null = include all
    includedInvestmentIds: v.optional(v.array(v.string())),
    // Whether to hide excluded-from-calculator assets by default
    hideExcluded: v.boolean(),
    // Reference scope for percentages
    scope: v.union(
      v.literal("all"),        // relative to entire portfolio
      v.literal("report"),     // relative to investments in this report
      v.literal("category")    // relative to each investment's category
    ),
    // Sort order inside each category
    sortBy: v.union(
      v.literal("value"),      // current value high→low
      v.literal("change"),     // % change high→low
      v.literal("name"),       // alphabetical
      v.literal("addOrder")    // insertion order
    ),
    // Which fields to show in the report
    fields: v.object({
      currentValue: v.boolean(),
      portfolioPercent: v.boolean(),
      categoryPercent: v.boolean(),
      changePercent: v.boolean(),
      grossProfit: v.boolean(),
      netProfit: v.boolean(),        // after 25% tax
      taxPaid: v.boolean(),
    }),
    displayCurrency: v.union(v.literal("ILS"), v.literal("USD")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});