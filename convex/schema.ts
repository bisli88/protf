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
  }).index("by_user", ["userId"]),
  
  exchangeRates: defineTable({
    userId: v.id("users"),
    usdToIls: v.number(),
    lastUpdated: v.number(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
