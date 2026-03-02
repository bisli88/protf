import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const fetchExchangeRate = action({
  args: {},
  handler: async (ctx) => {
    try {
      // Using Open ER API (v6) which is highly reliable and updated frequently
      const response = await fetch("https://open.er-api.com/v6/latest/USD");
      
      if (!response.ok) {
        throw new Error("מקור הנתונים לא הגיב כמצופה");
      }

      const data = await response.json();
      
      if (data.result === "success" && data.rates && data.rates.ILS) {
        const usdToIls = data.rates.ILS;
        
        // Update the database with the fresh rate
        await ctx.runMutation(api.investments.updateExchangeRate, {
          usdToIls,
        });
        
        return usdToIls;
      }
      
      throw new Error("פורמט נתונים לא תקין מה-API");
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
      
      // Fallback strategy: try a secondary reliable source if the first fails
      try {
        const fallbackResponse = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
        const fallbackData = await fallbackResponse.json();
        if (fallbackData.rates && fallbackData.rates.ILS) {
          const rate = fallbackData.rates.ILS;
          await ctx.runMutation(api.investments.updateExchangeRate, { usdToIls: rate });
          return rate;
        }
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
      }
      
      throw new Error("נכשלנו בעדכון שער החליפין. אנא נסה שוב בעוד מספר דקות.");
    }
  },
});
