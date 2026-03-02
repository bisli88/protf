import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";

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

  const handleDelete = async (investmentId: Id<"investments">) => {
    if (confirm("Are you sure you want to delete this investment?")) {
      try {
        await deleteInvestment({ investmentId });
        toast.success("Investment deleted");
      } catch (error) {
        toast.error("Failed to delete investment");
      }
    }
  };

  if (investments.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        <p>No investments yet.</p>
        <p className="text-sm">Add your first investment to get started!</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Investments</h3>
      <div className="space-y-3">
        {investments.map((investment) => {
          const valueInILS = investment.currency === "USD" 
            ? investment.amount * exchangeRate 
            : investment.amount;

          return (
            <div
              key={investment._id}
              className="bg-gray-50 rounded-lg p-4 flex justify-between items-center"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{investment.name}</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {investment.category}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">
                    {investment.currency === "USD" ? "$" : "₪"}
                    {investment.amount.toLocaleString()}
                  </span>
                  {investment.currency === "USD" && (
                    <span className="ml-2">
                      (₪{valueInILS.toLocaleString('en-US', { maximumFractionDigits: 0 })})
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(investment._id)}
                className="text-red-500 hover:text-red-700 p-2"
                title="Delete investment"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
