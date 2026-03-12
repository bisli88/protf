import { useState } from "react";
import { Calculator, Globe, TrendingUp, Landmark } from "lucide-react";

interface InvestmentCalculatorProps {
  settings: {
    idealIsraelPercent: number;
    abroadIdeals?: Array<{ name: string; percent: number }>;
    israelIdeals?: Array<{ name: string; percent: number }>;
  };
  investments: Array<{
    _id: string;
    name: string;
    category: string;
    excludeFromCalculator?: boolean;
  }>;
  exchangeRate: number;
}

export function InvestmentCalculator({ settings, investments, exchangeRate }: InvestmentCalculatorProps) {
  const [amount, setAmount] = useState<number | "">("");
  const [mode, setMode] = useState<"global" | "abroad" | "israel">("global");

  const abroadAssets = investments.filter(inv => inv.category === "Abroad" && !inv.excludeFromCalculator);
  const israelAssets = investments.filter(inv => inv.category === "Israel" && !inv.excludeFromCalculator);

  const calculateDistribution = () => {
    if (!amount || amount <= 0) return [];

    // Helper to get current value in ILS
    const getILSValue = (inv: any) => inv.currency === "USD" ? inv.amount * exchangeRate : inv.amount;
    
    // Normalize input amount to ILS for internal calculations
    const amountInILS = mode === "abroad" ? (amount as number) * exchangeRate : (amount as number);

    if (mode === "global") {
      const currentIsraelTotal = israelAssets.reduce((sum, inv) => sum + getILSValue(inv), 0);
      const currentAbroadTotal = abroadAssets.reduce((sum, inv) => sum + getILSValue(inv), 0);
      const currentTotal = currentIsraelTotal + currentAbroadTotal;
      
      const targetTotal = currentTotal + amountInILS;
      const targetIsrael = (targetTotal * settings.idealIsraelPercent) / 100;
      const targetAbroad = targetTotal - targetIsrael;

      // How much to add to each to reach target
      let diffIsrael = Math.max(0, targetIsrael - currentIsraelTotal);
      let diffAbroad = Math.max(0, targetAbroad - currentAbroadTotal);

      // Normalize if the sum of differences doesn't match the input amount 
      const totalDiff = diffIsrael + diffAbroad;
      if (totalDiff > 0) {
        diffIsrael = (diffIsrael / totalDiff) * amountInILS;
        diffAbroad = (diffAbroad / totalDiff) * amountInILS;
      }

      return [
        { label: "ישראל", amount: diffIsrael, percent: settings.idealIsraelPercent, color: "text-blue-400", currency: "₪" },
        { label: "חו\"ל", amount: diffAbroad, percent: 100 - settings.idealIsraelPercent, color: "text-emerald-400", currency: "₪" },
      ];
    }

    if (mode === "abroad") {
      const currentTotalILS = abroadAssets.reduce((sum, inv) => sum + getILSValue(inv), 0);
      const targetTotalILS = currentTotalILS + amountInILS;
      
      const results = abroadAssets.map(inv => {
        const idealPercent = settings.abroadIdeals?.find(i => i.name === inv.name)?.percent || 0;
        const currentValILS = getILSValue(inv);
        const targetValILS = (targetTotalILS * idealPercent) / 100;
        return {
          label: inv.name,
          diff: Math.max(0, targetValILS - currentValILS),
          percent: idealPercent
        };
      });

      const totalDiff = results.reduce((sum, r) => sum + r.diff, 0);
      
      return results.map(res => ({
        label: res.label,
        amount: totalDiff > 0 ? (res.diff / totalDiff * amountInILS) / exchangeRate : 0,
        percent: res.percent,
        color: "text-[#D4AF37]",
        currency: "$"
      }));
    }

    if (mode === "israel") {
      const currentTotalILS = israelAssets.reduce((sum, inv) => sum + getILSValue(inv), 0);
      const targetTotalILS = currentTotalILS + amountInILS;
      
      const results = israelAssets.map(inv => {
        const idealPercent = settings.israelIdeals?.find(i => i.name === inv.name)?.percent || 0;
        const currentValILS = getILSValue(inv);
        const targetValILS = (targetTotalILS * idealPercent) / 100;
        return {
          label: inv.name,
          diff: Math.max(0, targetValILS - currentValILS),
          percent: idealPercent
        };
      });

      const totalDiff = results.reduce((sum, r) => sum + r.diff, 0);
      
      return results.map(res => ({
        label: res.label,
        amount: totalDiff > 0 ? (res.diff / totalDiff * amountInILS) : 0,
        percent: res.percent,
        color: "text-[#D4AF37]",
        currency: "₪"
      }));
    }

    return [];
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
          {/* Amount Input */}
          <div>
            <label className="block text-zinc-500 text-xs font-black uppercase tracking-widest mb-3">
              {mode === "abroad" ? "סכום להשקעה (בדוֹלרים)" : "סכום להשקעה (בשקלים)"}
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
                {mode === "abroad" ? "$" : "₪"}
              </span>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex p-1 bg-zinc-800 rounded-2xl border border-zinc-700">
            <button
              onClick={() => setMode("global")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
                mode === "global" ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500"
              }`}
            >
              <Landmark size={14} />
              ישראל/חו"ל
            </button>
            <button
              onClick={() => setMode("abroad")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
                mode === "abroad" ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500"
              }`}
            >
              <Globe size={14} />
              תוך חו"ל
            </button>
            <button
              onClick={() => setMode("israel")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${
                mode === "israel" ? "bg-zinc-700 text-white shadow-lg" : "text-zinc-500"
              }`}
            >
              <TrendingUp size={14} />
              תוך ישראל
            </button>
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
