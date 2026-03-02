import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { Trash2, TrendingUp, Globe, Clock, History, Briefcase, Diamond } from "lucide-react";

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
}

export function InvestmentsList({ investments, exchangeRate }: InvestmentsListProps) {
  const deleteInvestment = useMutation(api.investments.deleteInvestment);

  const categoryMap: Record<string, { label: string; icon: any; color: string }> = {
    "Israel": { label: "ישראל", icon: TrendingUp, color: "bg-blue-500/10 text-blue-400" },
    "Abroad": { label: "חו\"ל", icon: Globe, color: "bg-emerald-500/10 text-emerald-400" },
    "Long-Term": { label: "טווח ארוך", icon: History, color: "bg-purple-500/10 text-purple-400" },
    "Short-Term": { label: "טווח קצר", icon: Clock, color: "bg-orange-500/10 text-orange-400" }
  };

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
          {investments.length} ITEMS
        </span>
      </div>
      
      <div className="space-y-4">
        {investments.map((investment) => {
          const valueInILS = investment.currency === "USD" 
            ? investment.amount * exchangeRate 
            : investment.amount;
          
          const cat = categoryMap[investment.category];
          const Icon = cat?.icon || Briefcase;

          return (
            <div
              key={investment._id}
              className="bg-zinc-800/30 border border-zinc-800 rounded-3xl p-5 hover:bg-zinc-800/50 transition-all flex justify-between items-center group relative overflow-hidden"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-3">
                  <div className={`p-2.5 rounded-2xl ${cat?.color || "bg-zinc-800 text-zinc-400"}`}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg leading-tight">{investment.name}</h4>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      {cat?.label || investment.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-white tracking-tight">
                    <span className="text-[#D4AF37] text-sm font-bold mr-1">{investment.currency === "USD" ? "$" : "₪"}</span>
                    {investment.amount.toLocaleString()}
                  </span>
                  {investment.currency === "USD" && (
                    <span className="text-xs font-bold text-zinc-500">
                      ≈ ₪{valueInILS.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(investment._id)}
                className="text-zinc-600 hover:text-red-500 p-3 rounded-2xl hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                title="מחק השקעה"
              >
                <Trash2 size={20} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
