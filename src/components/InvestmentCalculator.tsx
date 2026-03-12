import { useState } from "react";
import { Calculator, Globe, TrendingUp, Landmark, LayoutGrid } from "lucide-react";
import * as LucideIcons from "lucide-react";

interface Category {
  _id: string;
  name: string;
  includeInStrategy: boolean;
  iconName: string;
  color: string;
  defaultCurrency: "ILS" | "USD";
}

interface InvestmentCalculatorProps {
  settings: {
    strategyWeights?: Record<string, number>;
    investmentWeights?: Record<string, Record<string, number>>;
  };
  investments: Array<{
    _id: string;
    name: string;
    category: string;
    amount: number;
    currency: "ILS" | "USD";
    excludeFromCalculator?: boolean;
  }>;
  categories: Category[];
  exchangeRate: number;
}

export function InvestmentCalculator({ settings, investments, categories, exchangeRate }: InvestmentCalculatorProps) {
  const [amount, setAmount] = useState<number | "">("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | "global">("global");

  const strategyCategories = categories.filter(c => c.includeInStrategy);
  
  const calculateDistribution = () => {
    if (!amount || amount <= 0) return [];

    const getILSValue = (inv: any) => inv.currency === "USD" ? inv.amount * exchangeRate : inv.amount;
    
    // Global Mode: Distribute across all strategy-enabled categories
    if (selectedCategoryId === "global") {
      const amountInILS = amount as number;
      
      // Calculate current totals per category
      const categoryTotals = strategyCategories.reduce((acc, cat) => {
        const catAssets = investments.filter(inv => inv.category === cat.name && !inv.excludeFromCalculator);
        acc[cat.name] = catAssets.reduce((sum, inv) => sum + getILSValue(inv), 0);
        return acc;
      }, {} as Record<string, number>);

      const currentTotal = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
      const targetTotal = currentTotal + amountInILS;
      const weights = settings.strategyWeights || {};

      const results = strategyCategories.map(cat => {
        const weight = weights[cat.name] || 0;
        const targetVal = (targetTotal * weight) / 100;
        const currentVal = categoryTotals[cat.name] || 0;
        return {
          label: cat.name,
          diff: Math.max(0, targetVal - currentVal),
          percent: weight,
          currency: "₪"
        };
      });

      const totalDiff = results.reduce((sum, r) => sum + r.diff, 0);
      return results.map(res => ({
        ...res,
        amount: totalDiff > 0 ? (res.diff / totalDiff) * amountInILS : 0,
        color: "text-[#D4AF37]"
      }));
    }

    // Category Mode: Distribute within a specific category
    const category = categories.find(c => c._id === selectedCategoryId);
    if (!category) return [];

    const isUSD = category.defaultCurrency === "USD";
    const amountInILS = isUSD ? (amount as number) * exchangeRate : (amount as number);
    
    const catAssets = investments.filter(inv => inv.category === category.name && !inv.excludeFromCalculator);
    const currentTotalILS = catAssets.reduce((sum, inv) => sum + getILSValue(inv), 0);
    const targetTotalILS = currentTotalILS + amountInILS;
    const weights = (settings.investmentWeights || {})[category.name] || {};

    const results = catAssets.map(inv => {
      const weight = weights[inv.name] || 0;
      const targetValILS = (targetTotalILS * weight) / 100;
      const currentValILS = getILSValue(inv);
      return {
        label: inv.name,
        diff: Math.max(0, targetValILS - currentValILS),
        percent: weight
      };
    });

    const totalDiff = results.reduce((sum, r) => sum + r.diff, 0);
    return results.map(res => ({
      label: res.label,
      amount: totalDiff > 0 ? (res.diff / totalDiff * amountInILS) / (isUSD ? exchangeRate : 1) : 0,
      percent: res.percent,
      color: "text-emerald-400",
      currency: isUSD ? "$" : "₪"
    }));
  };

  const results = calculateDistribution();

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#D4AF37]/10 p-2 rounded-xl">
            <Calculator size={20} className="text-[#D4AF37]" />
          </div>
          <h3 className="text-xl font-black text-white">מחשבון חלוקה</h3>
        </div>

        <div className="space-y-6">
          {/* Mode Selector - Dynamic */}
          <div className="flex overflow-x-auto p-1 bg-zinc-800 rounded-2xl border border-zinc-700 no-scrollbar gap-1">
            <button
              onClick={() => setSelectedCategoryId("global")}
              className={`flex-none flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                selectedCategoryId === "global" ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500"
              }`}
            >
              <LayoutGrid size={14} />
              גלובלי
            </button>
            {strategyCategories.map(cat => {
              const Icon = (LucideIcons as any)[cat.iconName] || Globe;
              return (
                <button
                  key={cat._id}
                  onClick={() => setSelectedCategoryId(cat._id)}
                  className={`flex-none flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                    selectedCategoryId === cat._id ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500"
                  }`}
                >
                  <Icon size={14} />
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-zinc-500 text-xs font-black uppercase tracking-widest mb-3">
              {selectedCategoryId !== "global" && categories.find(c => c._id === selectedCategoryId)?.defaultCurrency === "USD" 
                ? "סכום להשקעה (בדוֹלרים)" 
                : "סכום להשקעה (בשקלים)"}
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                placeholder="הכנס סכום..."
                className="w-full bg-zinc-800 border border-zinc-700 px-4 py-4 rounded-2xl text-white font-black text-2xl focus:border-[#D4AF37] outline-none transition-all pr-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-xl">
                {selectedCategoryId !== "global" && categories.find(c => c._id === selectedCategoryId)?.defaultCurrency === "USD" ? "$" : "₪"}
              </span>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="pt-6 border-t border-zinc-800 space-y-3">
              <label className="block text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">תוצאות חלוקה</label>
              {results.map((res, i) => (
                <div key={i} className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl flex justify-between items-center group animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div>
                    <p className="text-zinc-400 text-xs font-bold mb-1">{res.label}</p>
                    <p className="text-white font-black text-xl">
                      <span className="text-[#D4AF37] text-sm mr-1">{res.currency}</span>
                      {res.amount.toLocaleString(undefined, { maximumFractionDigits: res.currency === "$" ? 1 : 0 })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-700 ${res.color}`}>
                      {res.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!amount && (
            <div className="py-12 text-center text-zinc-600">
              <Calculator size={48} className="mx-auto mb-4 opacity-10" />
              <p className="text-sm font-medium">הזן סכום כדי לראות את החלוקה המומלצת</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
