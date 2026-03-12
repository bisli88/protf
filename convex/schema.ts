import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  investments: defineTable({
    userId: v.id("users"),
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
  }).index("by_user", ["userId"]),
  
  exchangeRates: defineTable({
    userId: v.id("users"),
    usdToIls: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),

  userSettings: defineTable({
    userId: v.id("users"),
    idealIsraelPercent: v.optional(v.number()),
    abroadIdeals: v.optional(v.any()),
    israelIdeals: v.optional(v.any()),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
