import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { Trash2, TrendingUp, Globe, Clock, History, Briefcase } from "lucide-react";

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
    "Israel": { label: "ישראל", icon: TrendingUp, color: "bg-blue-100 text-blue-700" },
    "Abroad": { label: "חו\"ל", icon: Globe, color: "bg-emerald-100 text-emerald-700" },
    "Long-Term": { label: "טווח ארוך", icon: History, color: "bg-purple-100 text-purple-700" },
    "Short-Term": { label: "טווח קצר", icon: Clock, color: "bg-orange-100 text-orange-700" }
  };

  const handleDelete = async (investmentId: Id<"investments">) => {
    if (confirm("האם אתה בטוח שברצונך למחוק השקעה זו?")) {
      try {
        await deleteInvestment({ investmentId });
        toast.success("ההשקעה נמחקה");
      } catch (error) {
        toast.error("מחיקת ההשקעה נכשלה");
      }
    }
  };

  if (investments.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Briefcase className="text-gray-300" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">אין השקעות עדיין</h3>
        <p className="text-gray-500 max-w-[200px] mx-auto text-sm">
          הוסף את ההשקעה הראשונה שלך כדי להתחיל לעקוב אחר התיק
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-5 px-1">
        <h3 className="text-xl font-bold text-gray-900">ההשקעות שלך</h3>
        <span className="bg-blue-50 text-blue-600 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-100">
          {investments.length} נכסים
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
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-xl ${cat?.color || "bg-gray-100 text-gray-600"}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 leading-tight">{investment.name}</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {cat?.label || investment.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-black text-gray-900">
                    {investment.currency === "USD" ? "$" : "₪"}
                    {investment.amount.toLocaleString()}
                  </span>
                  {investment.currency === "USD" && (
                    <span className="text-sm font-medium text-gray-400">
                      ≈ ₪{valueInILS.toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDelete(investment._id)}
                className="text-gray-300 hover:text-red-500 p-3 rounded-xl hover:bg-red-50 transition-all active:scale-90"
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
