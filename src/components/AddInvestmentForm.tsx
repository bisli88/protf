import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { X, DollarSign, Tag, Globe, History, Clock, MapPin } from "lucide-react";

interface AddInvestmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddInvestmentForm({ onClose, onSuccess }: AddInvestmentFormProps) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"ILS" | "USD">("ILS");
  const [category, setCategory] = useState<"Israel" | "Abroad" | "Long-Term" | "Short-Term">("Israel");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addInvestment = useMutation(api.investments.addInvestment);

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
      await addInvestment({
        name: name.trim(),
        amount: amountNum,
        currency,
        category,
      });
      onSuccess();
    } catch (error) {
      toast.error("הוספת ההשקעה נכשלה");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-8 animate-slide-up shadow-2xl overflow-y-auto max-h-[95vh]">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900">הוספת השקעה</h2>
            <p className="text-gray-500 text-sm">הזן את פרטי ההשקעה החדשה שלך</p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-400 hover:text-gray-600 p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Tag size={16} className="text-blue-500" />
              שם ההשקעה
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 border-2 rounded-2xl outline-none transition-all text-gray-900 font-medium"
              placeholder="למשל: מניית אפל, ביטקוין וכו'"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <DollarSign size={16} className="text-emerald-500" />
                סכום
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 border-2 rounded-2xl outline-none transition-all text-gray-900 font-medium"
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Globe size={16} className="text-indigo-500" />
                מטבע
              </label>
              <div className="relative">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as "ILS" | "USD")}
                  className="w-full px-5 py-4 bg-gray-50 border-transparent focus:bg-white focus:border-blue-500 border-2 rounded-2xl outline-none transition-all text-gray-900 font-bold appearance-none cursor-pointer"
                >
                  <option value="ILS">₪ שקל</option>
                  <option value="USD">$ דולר</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <MapPin size={16} className="text-orange-500" />
              קטגוריית השקעה
            </label>
            <div className="grid grid-cols-2 gap-2">
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
                  className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all font-bold text-sm ${
                    category === cat.id 
                      ? `bg-${cat.color}-50 border-${cat.color}-500 text-${cat.color}-700 shadow-sm` 
                      : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <cat.icon size={16} />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              {isSubmitting ? "מוסיף..." : "הוסף השקעה"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
