import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { Trash2, Globe, Diamond, Edit3, LayoutGrid, Briefcase, TrendingUp, TrendingDown, Calculator } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Category {
  _id: Id<"categories">;
  name: string;
  defaultCurrency: "ILS" | "USD";
  includeInStrategy: boolean;
  iconName: string;
  color: string;
}

interface Investment {
  _id: Id<"investments">;
  name: string;
  ticker?: string; 
  amount: number;
  initialAmount?: number;
  currency: "ILS" | "USD";
  category: string;
  excludeFromCalculator?: boolean;
}

interface InvestmentsListProps {
  investments: Investment[];
  categories: Category[];
  exchangeRate: number;
  onEdit: (investment: Investment) => void;
  isPrivate: boolean;
}

function getPnl(current: number, initial?: number) {
  if (!initial || initial <= 0) return null;
  const diff = current - initial;
  const pct = (diff / initial) * 100;
  return { diff, pct, isPositive: diff >= 0 };
}

export function InvestmentsList({ investments, categories, exchangeRate, onEdit, isPrivate }: InvestmentsListProps) {
  const deleteInvestment = useMutation(api.investments.deleteInvestment);
  const [selectedTab, setSelectedTab] = useState<string>("All");
  const [hideExcluded, setHideExcluded] = useState(false);

  const filteredInvestments = (selectedTab === "All"
    ? investments
    : investments.filter(inv => inv.category === selectedTab)
  ).filter(inv => !hideExcluded || !inv.excludeFromCalculator);

  const handleDelete = async (investmentId: Id<"investments">) => {
    if (confirm("האם אתה בטוח שברצונך למחוק השקעה זו?")) {
      try {
        await deleteInvestment({ investmentId });
        toast.success("ההשקעה הוסרה");
      } catch (error) {
        toast.error("מחיקת ההשקעה נכשלה");
      }
    }
  };

  // Category P&L summary
  const getCategoryPnl = () => {
    if (selectedTab === "All") return null;
    const withInitial = filteredInvestments.filter(i => i.initialAmount && i.initialAmount > 0);
    if (withInitial.length === 0) return null;

    const totalCurrent = withInitial.reduce((sum, i) =>
      sum + (i.currency === "USD" ? i.amount * exchangeRate : i.amount), 0);
    const totalInitial = withInitial.reduce((sum, i) =>
      sum + (i.currency === "USD" ? i.initialAmount! * exchangeRate : i.initialAmount!), 0);
    const diff = totalCurrent - totalInitial;
    const pct = (diff / totalInitial) * 100;
    return { diff, pct, isPositive: diff >= 0 };
  };

  const categoryPnl = getCategoryPnl();

  if (investments.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <div className="bg-zinc-800/50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700">
          <Diamond className="text-[#D4AF37]/30" size={40} />
        </div>
        <h3 className="text-xl font-black text-white mb-2 tracking-tight">התיק ריק</h3>
        <p className="text-zinc-500 max-w-[200px] mx-auto text-sm font-medium">
          התחל לבנות את ההון שלך על ידי הוספת נכסים
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-8 px-2">
        <h3 className="text-xl font-black text-white tracking-tight">נכסים נוכחיים</h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 px-3 py-1 rounded-full">
          {filteredInvestments.length} ITEMS
        </span>
      </div>

      {/* Calculator filter */}
      <button
        onClick={() => setHideExcluded(!hideExcluded)}
        className="flex items-center gap-3 mb-6 px-2 group"
      >
        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
          hideExcluded
            ? 'bg-[#D4AF37] border-[#D4AF37]'
            : 'bg-transparent border-zinc-600 group-hover:border-zinc-400'
        }`}>
          {hideExcluded && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Calculator size={13} className={hideExcluded ? 'text-[#D4AF37]' : 'text-zinc-500'} />
          <span className={`text-xs font-black uppercase tracking-widest transition-colors ${
            hideExcluded ? 'text-[#D4AF37]' : 'text-zinc-500 group-hover:text-zinc-400'
          }`}>
            הצג רק נכסי מחשבון
          </span>
        </div>
      </button>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-4 -mx-4 px-4 gap-2 no-scrollbar">
        <button
          onClick={() => setSelectedTab("All")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap transition-all duration-300 font-bold text-sm ${
            selectedTab === "All"
              ? "bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_4px_12px_-2px_rgba(212,175,55,0.3)]"
              : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600"
          }`}
        >
          <LayoutGrid size={14} className={selectedTab === "All" ? "text-black" : "text-zinc-500"} />
          הכל
        </button>
        {categories.map((tab) => {
          const Icon = (LucideIcons as any)[tab.iconName] || Globe;
          const isActive = selectedTab === tab.name;
          return (
            <button
              key={tab._id}
              onClick={() => setSelectedTab(tab.name)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap transition-all duration-300 font-bold text-sm ${
                isActive
                  ? "bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_4px_12px_-2px_rgba(212,175,55,0.3)]"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <Icon size={14} className={isActive ? "text-black" : "text-zinc-500"} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Category P&L Banner */}
      {categoryPnl && (
        <div className={`mb-5 px-5 py-3.5 rounded-2xl border flex items-center justify-between transition-all ${
          categoryPnl.isPositive
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : 'bg-red-500/5 border-red-500/20'
        }`}>
          <div className="flex items-center gap-2">
            {categoryPnl.isPositive
              ? <TrendingUp size={14} className="text-emerald-400" />
              : <TrendingDown size={14} className="text-red-400" />
            }
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              ביצועי {selectedTab}
            </span>
          </div>
          <div className={`flex items-center gap-3 transition-all duration-500 ${isPrivate ? 'blur-md select-none' : ''}`}>
            <span className={`text-sm font-black ${categoryPnl.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {categoryPnl.isPositive ? '+' : ''}{categoryPnl.pct.toFixed(1)}%
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${
              categoryPnl.isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
            }`}>
              {categoryPnl.isPositive ? '+' : ''}₪{Math.abs(categoryPnl.diff).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {filteredInvestments.length === 0 ? (
          <div className="py-12 text-center bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-800">
            <p className="text-zinc-500 font-bold">אין נכסים בקטגוריה זו</p>
          </div>
        ) : (
          filteredInvestments.map((investment) => {
            const valueInILS = investment.currency === "USD"
              ? investment.amount * exchangeRate
              : investment.amount;

            const cat = categories.find(c => c.name === investment.category);
            const Icon = cat ? (LucideIcons as any)[cat.iconName] : Briefcase;
            const pnl = getPnl(investment.amount, investment.initialAmount);

            return (
              <div
                key={investment._id}
                className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-3 hover:bg-zinc-800/50 transition-all flex justify-between items-center group relative overflow-hidden"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-1.5 rounded-xl ${cat ? `bg-${cat.color}-500/10 text-${cat.color}-400` : "bg-zinc-800 text-zinc-400"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{investment.name}</h4>
                      <div className="flex items-center gap-2">
                        {investment.ticker && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/70 bg-[#D4AF37]/10 px-1.5 py-0.5 rounded-md">
                            {investment.ticker}
                          </span>
                        )}
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                          {investment.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`transition-all duration-500 ${isPrivate ? 'blur-md opacity-40 select-none' : ''}`}>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-white tracking-tight">
                        <span className="text-[#D4AF37] text-xs font-bold mr-1">{investment.currency === "USD" ? "$" : "₪"}</span>
                        {investment.amount.toLocaleString()}
                      </span>
                      {investment.currency === "USD" && (
                        <span className="text-[10px] font-bold text-zinc-600">
                          ≈ ₪{valueInILS.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>

                    {/* P&L Row */}
                    {pnl && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-black ${pnl.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                          {pnl.isPositive ? '▲' : '▼'} {Math.abs(pnl.pct).toFixed(1)}%
                        </span>
                        <span className={`text-[10px] font-bold ${pnl.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                          {pnl.isPositive ? '+' : '-'}{investment.currency === 'USD' ? '$' : '₪'}{Math.abs(pnl.diff).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(investment)}
                    className="text-zinc-500 hover:text-[#D4AF37] p-2.5 rounded-2xl hover:bg-[#D4AF37]/10 transition-all"
                    title="ערוך השקעה"
                  >
                    <Edit3 size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(investment._id)}
                    className="text-zinc-600 hover:text-red-500 p-2.5 rounded-2xl hover:bg-red-500/10 transition-all"
                    title="מחק השקעה"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}