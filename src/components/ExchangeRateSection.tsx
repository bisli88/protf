import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { RefreshCw, Edit3, Save, X, Info } from "lucide-react";

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
      toast.success("שער החליפין עודכן מהאינטרנט");
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
      toast.success("שער החליפין עודכן ידנית");
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
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-xl">
            <RefreshCw className={`text-blue-600 ${isUpdating ? 'animate-spin' : ''}`} size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">שער חליפין USD/ILS</h4>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-24 px-3 py-1.5 text-lg font-bold border-2 border-blue-500 rounded-xl focus:outline-none bg-blue-50"
                  autoFocus
                />
                <button
                  onClick={handleSaveManualRate}
                  className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                  title="שמור"
                >
                  <Save size={18} />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditValue(exchangeRate.toString());
                  }}
                  className="p-2 bg-gray-200 text-gray-500 rounded-lg hover:bg-gray-300 transition-colors"
                  title="ביטול"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <p className="text-2xl font-black text-gray-900 mt-0.5">
                ₪{exchangeRate.toFixed(3)} <span className="text-sm font-medium text-gray-400">ל-$1</span>
              </p>
            )}
          </div>
        </div>
        
        {!isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleFetchRate}
              disabled={isUpdating}
              className="p-2.5 bg-gray-50 text-blue-600 rounded-xl hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-100 disabled:opacity-50"
              title="עדכן מהאינטרנט"
            >
              <RefreshCw size={20} className={isUpdating ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
              title="ערוך ידנית"
            >
              <Edit3 size={20} />
            </button>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg w-fit">
        <Info size={12} />
        <span>עודכן לאחרונה: {formatLastUpdated(lastUpdated)}</span>
      </div>
    </div>
  );
}
