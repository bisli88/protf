import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { Trash2, TrendingUp, Globe, Clock, History, Briefcase, Diamond, Edit3, LayoutGrid } from "lucide-react";

interface Investment {
  _id: Id<"investments">;
  name: string;
  amount: number;
  currency: "ILS" | "USD";
  category: "Israel" | "Abroad" | "Long-Term" | "Short-Term";
}

interface InvestmentsListProps {
  investments: Investment[];
  exchangeRate: number;
  onEdit: (investment: Investment) => void;
  isPrivate: boolean;
}

type FilterCategory = "All" | "Israel" | "Abroad" | "Long-Term" | "Short-Term";

export function InvestmentsList({ investments, exchangeRate, onEdit, isPrivate }: InvestmentsListProps) {
  const deleteInvestment = useMutation(api.investments.deleteInvestment);
  const [selectedTab, setSelectedTab] = useState<FilterCategory>("All");

  const categoryMap: Record<string, { label: string; icon: any; color: string }> = {
    "Israel": { label: "ישראל", icon: TrendingUp, color: "bg-blue-500/10 text-blue-400" },
    "Abroad": { label: "חו\"ל", icon: Globe, color: "bg-emerald-500/10 text-emerald-400" },
    "Long-Term": { label: "טווח ארוך", icon: History, color: "bg-purple-500/10 text-purple-400" },
    "Short-Term": { label: "טווח קצר", icon: Clock, color: "bg-orange-500/10 text-orange-400" }
  };

  const tabs: { id: FilterCategory; label: string; icon: any }[] = [
    { id: "All", label: "הכל", icon: LayoutGrid },
    { id: "Israel", label: "ישראל", icon: TrendingUp },
    { id: "Abroad", label: "חו\"ל", icon: Globe },
    { id: "Long-Term", label: "טווח ארוך", icon: History },
    { id: "Short-Term", label: "טווח קצר", icon: Clock },
  ];

  const filteredInvestments = selectedTab === "All" 
    ? investments 
    : investments.filter(inv => inv.category === selectedTab);

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

      {/* Categories Tabs */}
      <div className="flex overflow-x-auto pb-4 mb-6 -mx-4 px-4 gap-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap transition-all duration-300 font-bold text-sm ${
                isActive 
                  ? "bg-[#D4AF37] border-[#D4AF37] text-black shadow-[0_4px_12px_-2px_rgba(212,175,55,0.3)]" 
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:border-zinc-600"
              }`}
            >
              <Icon size={14} className={isActive ? "text-black" : "text-zinc-500"} />
              {tab.label}
            </button>
          );
        })}
      </div>
      
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
            
            const cat = categoryMap[investment.category];
            const Icon = cat?.icon || Briefcase;

            return (
              <div
                key={investment._id}
                className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-3 hover:bg-zinc-800/50 transition-all flex justify-between items-center group relative overflow-hidden"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`p-1.5 rounded-xl ${cat?.color || "bg-zinc-800 text-zinc-400"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-tight">{investment.name}</h4>
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                        {cat?.label || investment.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-baseline gap-2 transition-all duration-500 ${isPrivate ? 'blur-md opacity-40 select-none' : ''}`}>
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
