import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { RefreshCw, Edit3, Save, X, Info, TrendingUp } from "lucide-react";

interface ExchangeRateSectionProps {
  exchangeRate: number;
  lastUpdated: number;
}

export function ExchangeRateSection({ exchangeRate, lastUpdated }: ExchangeRateSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(exchangeRate.toString());
  const [isUpdating, setIsUpdating] = useState(false);
  
  const fetchExchangeRate = useAction(api.exchangeRate.fetchExchangeRate);
  const updateExchangeRate = useMutation(api.investments.updateExchangeRate);

  const handleFetchRate = async () => {
    setIsUpdating(true);
    try {
      await fetchExchangeRate();
      toast.success("שער החליפין עודכן בהצלחה", {
        className: "bg-zinc-900 text-white border-zinc-800"
      });
    } catch (error) {
      toast.error("עדכון שער החליפין נכשל");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveManualRate = async () => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error("אנא הזן שער חליפין תקין");
      return;
    }

    try {
      await updateExchangeRate({ usdToIls: newRate });
      setIsEditing(false);
      toast.success("השער עודכן ידנית");
    } catch (error) {
      toast.error("עדכון שער החליפין נכשל");
    }
  };

  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "ממש עכשיו";
    if (diffHours < 24) return `לפני ${diffHours} שעות`;
    return date.toLocaleDateString('he-IL');
  };

  return (
    <div className="p-6 bg-zinc-900/50">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#D4AF37]/10 p-3 rounded-2xl border border-[#D4AF37]/20">
            <RefreshCw className={`text-[#D4AF37] ${isUpdating ? 'animate-spin' : ''}`} size={24} />
          </div>
          <div>
            <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">USD to ILS Rate</h4>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-28 px-4 py-2 text-lg font-black bg-zinc-800 border-2 border-[#D4AF37] rounded-xl text-white outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveManualRate}
                  className="p-2.5 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  <Save size={20} strokeWidth={3} />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(exchangeRate.toString());
                  }}
                  className="p-2.5 bg-zinc-700 text-white rounded-xl hover:bg-zinc-600 transition-colors"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <p className="text-3xl font-black text-white mt-1 tracking-tight">
                <span className="text-[#D4AF37] text-xl font-bold mr-1">₪</span>
                {exchangeRate.toFixed(3)}
              </p>
            )}
          </div>
        </div>
        
        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleFetchRate}
              disabled={isUpdating}
              className="p-3 bg-zinc-800/80 text-[#D4AF37] rounded-2xl hover:bg-zinc-700 transition-all border border-zinc-700/50 disabled:opacity-50"
              title="עדכן מהאינטרנט"
            >
              <RefreshCw size={22} className={isUpdating ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-3 bg-zinc-800/80 text-zinc-400 rounded-2xl hover:bg-zinc-700 transition-all border border-zinc-700/50"
              title="ערוך ידנית"
            >
              <Edit3 size={22} />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 bg-zinc-800/50 px-4 py-2 rounded-xl w-fit border border-zinc-800">
        <Info size={14} className="text-[#D4AF37]" />
        <span className="uppercase tracking-widest">עודכן לאחרונה: {formatLastUpdated(lastUpdated)}</span>
      </div>
    </div>
  );
}
