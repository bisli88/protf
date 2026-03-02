import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const fetchExchangeRate = action({
  args: {},
  handler: async (ctx) => {
    try {
      // Using exchangerate-api.com which has a free tier
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = await response.json();
      
      if (data.rates && data.rates.ILS) {
        const usdToIls = data.rates.ILS;
        await ctx.runMutation(api.investments.updateExchangeRate, {
          usdToIls,
        });
        return usdToIls;
      }
      
      throw new Error("Failed to fetch exchange rate");
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      throw new Error("Failed to fetch exchange rate from API");
    }
  },
});
