import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { AddInvestmentForm } from "./AddInvestmentForm";
import { ExchangeRateSection } from "./ExchangeRateSection";
import { PortfolioCharts } from "./PortfolioCharts";
import { InvestmentsList } from "./InvestmentsList";
import { SignOutButton } from "../SignOutButton";
import { Plus, TrendingUp, Wallet, Award, Eye, EyeOff } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

interface Investment {
  _id: Id<"investments">;
  name: string;
  amount: number;
  currency: "ILS" | "USD";
  category: "Israel" | "Abroad" | "Long-Term" | "Short-Term";
}

export function PortfolioTracker() {
  const portfolio = useQuery(api.investments.getPortfolio);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  if (!portfolio) {
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-[#0A0A0B] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-4"></div>
        <p className="text-[#D4AF37] font-medium">טוען את תיק ההשקעות שלך...</p>
      </div>
    );
  }

  const { investments, exchangeRate } = portfolio;

  const totalValueILS = investments.reduce((total, investment) => {
    const valueInILS = investment.currency === "USD" 
      ? investment.amount * exchangeRate 
      : investment.amount;
    return total + valueInILS;
  }, 0);

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingInvestment(null);
  };

  return (
    <div className="max-w-md mx-auto bg-[#0A0A0B] min-h-screen pb-32">
      {/* Premium Header Card */}
      <div className="px-6 pt-12 pb-14 bg-zinc-900/50 border-b border-zinc-800 rounded-b-[3rem] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4 bg-zinc-800/50 px-4 py-1.5 rounded-full border border-zinc-700/50">
            <Award size={14} className="text-[#D4AF37]" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Wealth Portfolio</p>
          </div>
          
          <div className="flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-zinc-500 mb-2 flex items-center gap-2">
              שווי התיק הכולל שלך
              <button 
                onClick={() => setIsPrivate(!isPrivate)}
                className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-[#D4AF37]"
              >
                {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </p>
            <p className={`text-6xl font-black text-white tracking-tighter transition-all duration-500 ${isPrivate ? 'blur-xl' : ''}`}>
              <span className="text-2xl font-normal text-[#D4AF37] ml-2">₪</span>
              {totalValueILS.toLocaleString('he-IL', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-6">
        {/* Exchange Rate Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl">
          <ExchangeRateSection 
            exchangeRate={exchangeRate}
            lastUpdated={portfolio.lastUpdated}
          />
        </div>

        {/* Charts Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
          <PortfolioCharts 
            investments={investments} 
            exchangeRate={exchangeRate} 
            isPrivate={isPrivate}
          />
        </div>

        {/* Investments List */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-1 shadow-xl">
          <InvestmentsList 
            investments={investments} 
            exchangeRate={exchangeRate} 
            onEdit={handleEdit}
            isPrivate={isPrivate}
          />
        </div>

        {/* Sign Out Section */}
        <div className="pt-12 pb-12 flex justify-center">
          <SignOutButton />
        </div>
      </div>

      {/* Luxury Floating Add Button */}
      <div className="fixed bottom-8 right-0 left-0 flex justify-center z-40 px-6 pointer-events-none">
        <button
          onClick={() => setShowAddForm(true)}
          className="pointer-events-auto bg-gold-gradient text-black shadow-[0_10px_40px_-10px_rgba(212,175,55,0.4)] flex items-center gap-3 px-10 py-5 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 group"
        >
          <Plus size={24} className="stroke-[3px]" />
          <span>הוסף השקעה חדשה</span>
        </button>
      </div>

      {/* Modal Backdrop and Form */}
      {showAddForm && (
        <AddInvestmentForm 
          onClose={handleCloseForm}
          onSuccess={handleCloseForm}
          investment={editingInvestment || undefined}
        />
      )}
    </div>
  );
}
