import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { AddInvestmentForm } from "./AddInvestmentForm";
import { ExchangeRateSection } from "./ExchangeRateSection";
import { PortfolioCharts } from "./PortfolioCharts";
import { InvestmentsList } from "./InvestmentsList";

export function PortfolioTracker() {
  const portfolio = useQuery(api.investments.getPortfolio);
  const [showAddForm, setShowAddForm] = useState(false);

  if (!portfolio) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { investments, exchangeRate } = portfolio;

  // Calculate total portfolio value in ILS
  const totalValueILS = investments.reduce((total, investment) => {
    const valueInILS = investment.currency === "USD" 
      ? investment.amount * exchangeRate 
      : investment.amount;
    return total + valueInILS;
  }, 0);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Portfolio Total */}
      <div className="px-4 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
          <p className="text-3xl font-bold text-gray-900">
            ₪{totalValueILS.toLocaleString('en-US', { 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 0 
            })}
          </p>
        </div>
      </div>

      {/* Exchange Rate Section */}
      <ExchangeRateSection 
        exchangeRate={exchangeRate}
        lastUpdated={portfolio.lastUpdated}
      />

      {/* Add Investment Button */}
      <div className="px-4 py-4 border-b">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Add New Investment
        </button>
      </div>

      {/* Add Investment Form Modal */}
      {showAddForm && (
        <AddInvestmentForm 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            toast.success("Investment added successfully");
          }}
        />
      )}

      {/* Investments List */}
      <InvestmentsList investments={investments} exchangeRate={exchangeRate} />

      {/* Charts */}
      <PortfolioCharts investments={investments} exchangeRate={exchangeRate} />
    </div>
  );
}
