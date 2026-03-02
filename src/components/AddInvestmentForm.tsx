import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { X, DollarSign, Tag, Globe, History, Clock, MapPin, Award } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

interface Investment {
  _id: Id<"investments">;
  name: string;
  amount: number;
  currency: "ILS" | "USD";
  category: "Israel" | "Abroad" | "Long-Term" | "Short-Term";
}

interface AddInvestmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
  investment?: Investment; // Optional investment for editing
}

export function AddInvestmentForm({ onClose, onSuccess, investment }: AddInvestmentFormProps) {
  const [name, setName] = useState(investment?.name || "");
  const [amount, setAmount] = useState(investment?.amount.toString() || "");
  const [currency, setCurrency] = useState<"ILS" | "USD">(investment?.currency || "ILS");
  const [category, setCategory] = useState<"Israel" | "Abroad" | "Long-Term" | "Short-Term">(investment?.category || "Israel");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addInvestment = useMutation(api.investments.addInvestment);
  const updateInvestment = useMutation(api.investments.updateInvestment);

  const isEditing = !!investment;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("אנא הזן שם להשקעה");
      return;
    }
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("אנא הזן סכום תקין");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && investment) {
        await updateInvestment({
          investmentId: investment._id,
          name: name.trim(),
          amount: amountNum,
          currency,
          category,
        });
        toast.success("ההשקעה עודכנה בהצלחה");
      } else {
        await addInvestment({
          name: name.trim(),
          amount: amountNum,
          currency,
          category,
        });
        toast.success("ההשקעה נוספה לפורטפוליו");
      }
      onSuccess();
    } catch (error) {
      toast.error(isEditing ? "עדכון ההשקעה נכשל" : "הוספת ההשקעה נכשלה");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-zinc-900 w-full max-w-md rounded-t-[3rem] sm:rounded-[3rem] p-8 animate-slide-up shadow-[0_-20px_50px_-20px_rgba(212,175,55,0.2)] overflow-y-auto max-h-[95vh] border-t border-zinc-800">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37] p-2 rounded-xl">
              <Award size={24} className="text-black stroke-[3px]" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                {isEditing ? "עריכת נכס" : "נכס חדש"}
              </h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                {isEditing ? "Update your asset" : "Add to your wealth"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-zinc-800 text-zinc-400 hover:text-white p-3 rounded-2xl transition-all"
          >
            <X size={24} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] ml-2">
              שם ההשקעה
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-6 py-5 bg-zinc-800/50 border-2 border-zinc-800 focus:border-[#D4AF37] rounded-3xl outline-none transition-all text-white font-bold text-lg"
              placeholder="e.g. Apple Stock, Gold, Crypto..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] ml-2">
                סכום
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-6 py-5 bg-zinc-800/50 border-2 border-zinc-800 focus:border-[#D4AF37] rounded-3xl outline-none transition-all text-white font-black text-lg"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] ml-2">
                מטבע
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "ILS" | "USD")}
                className="w-full px-6 py-5 bg-zinc-800/50 border-2 border-zinc-800 focus:border-[#D4AF37] rounded-3xl outline-none transition-all text-white font-black text-lg appearance-none cursor-pointer"
              >
                <option value="ILS">₪ ILS</option>
                <option value="USD">$ USD</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] ml-2">
              קטגוריית השקעה
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'Israel', label: 'ישראל', icon: MapPin, color: 'blue' },
                { id: 'Abroad', label: 'חו"ל', icon: Globe, color: 'emerald' },
                { id: 'Long-Term', label: 'טווח ארוך', icon: History, color: 'purple' },
                { id: 'Short-Term', label: 'טווח קצר', icon: Clock, color: 'orange' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id as any)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all font-black text-xs ${
                    category === cat.id 
                      ? `bg-zinc-800 border-[#D4AF37] text-white` 
                      : 'bg-zinc-800/30 border-zinc-800 text-zinc-500 hover:bg-zinc-800/50'
                  }`}
                >
                  <cat.icon size={16} className={category === cat.id ? 'text-[#D4AF37]' : ''} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-8 py-5 bg-zinc-800 text-zinc-400 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:text-white transition-all"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] px-8 py-5 bg-gold-gradient text-black rounded-[2rem] font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_10px_30px_-10px_rgba(212,175,55,0.4)]"
            >
              {isSubmitting ? "Processing..." : (isEditing ? "שמור שינויים" : "Confirm Investment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
