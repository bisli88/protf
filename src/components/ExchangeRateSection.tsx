import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

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
      toast.success("Exchange rate updated from internet");
    } catch (error) {
      toast.error("Failed to fetch exchange rate");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveManualRate = async () => {
    const newRate = parseFloat(editValue);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error("Please enter a valid exchange rate");
      return;
    }

    try {
      await updateExchangeRate({ usdToIls: newRate });
      setIsEditing(false);
      toast.success("Exchange rate updated manually");
    } catch (error) {
      toast.error("Failed to update exchange rate");
    }
  };

  const formatLastUpdated = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="px-4 py-4 bg-gray-50 border-b">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-gray-600">USD/ILS Exchange Rate</p>
          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-20 px-2 py-1 text-lg font-semibold border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleSaveManualRate}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditValue(exchangeRate.toString());
                }}
                className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-lg font-semibold text-gray-900">
              ₪{exchangeRate.toFixed(3)} per $1
            </p>
          )}
        </div>
        
        {!isEditing && (
          <div className="flex flex-col gap-2">
            <button
              onClick={handleFetchRate}
              disabled={isUpdating}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Update from Internet"}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Edit Manually
            </button>
          </div>
        )}
      </div>
      
      <p className="text-xs text-gray-500">
        Last updated: {formatLastUpdated(lastUpdated)}
      </p>
    </div>
  );
}
