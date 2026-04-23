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
  }).index("by_user", ["userId"]),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    defaultCurrency: v.union(v.literal("ILS"), v.literal("USD")),
    includeInStrategy: v.boolean(),
    iconName: v.string(), // name of lucide icon
    color: v.string(), // tailwind color class or hex
  }).index("by_user", ["userId"]),
  
  exchangeRates: defineTable({
    userId: v.id("users"),
    usdToIls: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    strategyWeights: v.optional(v.any()), // Map of category name to percent
    investmentWeights: v.optional(v.any()), // Map of category name to array of {name, percent}
    customCharts: v.optional(v.array(v.object({
      id: v.string(),
      title: v.string(),
      type: v.union(v.literal("categories"), v.literal("single-category")),
      selectedCategories: v.array(v.string()), // Names of categories
    }))),
    idealIsraelPercent: v.optional(v.number()), // Keep for backward compatibility
    abroadIdeals: v.optional(v.any()), // Keep for backward compatibility
    israelIdeals: v.optional(v.any()), // Keep for backward compatibility
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
