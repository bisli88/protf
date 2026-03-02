import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { AddInvestmentForm } from "./AddInvestmentForm";
import { ExchangeRateSection } from "./ExchangeRateSection";
import { PortfolioCharts } from "./PortfolioCharts";
import { InvestmentsList } from "./InvestmentsList";
import { Plus, TrendingUp, Wallet } from "lucide-react";

export function PortfolioTracker() {
  const portfolio = useQuery(api.investments.getPortfolio);
  const [showAddForm, setShowAddForm] = useState(false);

  if (!portfolio) {
    return (
      <div className="flex flex-col justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">טוען את התיק שלך...</p>
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
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-24">
      {/* Header Stat Card */}
      <div className="px-4 pt-8 pb-10 bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-b-[2.5rem] shadow-lg mb-6">
        <div className="flex items-center justify-center gap-2 mb-2 opacity-90">
          <Wallet size={18} />
          <p className="text-sm font-medium uppercase tracking-wider">שווי תיק כולל</p>
        </div>
        <div className="text-center">
          <p className="text-5xl font-extrabold tracking-tight">
            <span className="text-3xl font-normal ml-1">₪</span>
            {totalValueILS.toLocaleString('he-IL', { 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 0 
            })}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm backdrop-blur-md">
            <TrendingUp size={16} />
            <span>התיק שלך מעודכן</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Exchange Rate Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <ExchangeRateSection 
            exchangeRate={exchangeRate}
            lastUpdated={portfolio.lastUpdated}
          />
        </div>

        {/* Investments List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
          <InvestmentsList investments={investments} exchangeRate={exchangeRate} />
        </div>

        {/* Charts Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <PortfolioCharts investments={investments} exchangeRate={exchangeRate} />
        </div>
      </div>

      {/* Floating Add Button - Best for Mobile UX */}
      <div className="fixed bottom-6 right-6 left-6 flex justify-center z-40 pointer-events-none">
        <button
          onClick={() => setShowAddForm(true)}
          className="pointer-events-auto bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/50 flex items-center gap-3 px-8 py-4 rounded-full font-bold transition-all hover:scale-105 active:scale-95 group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
          <span>הוסף השקעה חדשה</span>
        </button>
      </div>

      {/* Add Investment Form Modal */}
      {showAddForm && (
        <AddInvestmentForm 
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            toast.success("ההשקעה נוספה בהצלחה!", {
              icon: "💰",
              className: "bg-green-50 text-green-800 border-green-100"
            });
          }}
        />
      )}
    </div>
  );
}
