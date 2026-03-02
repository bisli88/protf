import { PieChart } from "./PieChart";

interface Investment {
  name: string;
  amount: number;
  currency: "ILS" | "USD";
  category: "Israel" | "Abroad" | "Long-Term" | "Short-Term";
}

interface PortfolioChartsProps {
  investments: Investment[];
  exchangeRate: number;
}

export function PortfolioCharts({ investments, exchangeRate }: PortfolioChartsProps) {
  // Convert all amounts to ILS for calculations
  const investmentsInILS = investments.map(inv => ({
    ...inv,
    amountILS: inv.currency === "USD" ? inv.amount * exchangeRate : inv.amount,
  }));

  // 1. Israel vs Abroad
  const geographicData = investmentsInILS
    .filter(inv => inv.category === "Israel" || inv.category === "Abroad")
    .reduce((acc, inv) => {
      const key = inv.category as "Israel" | "Abroad";
      acc[key] = (acc[key] || 0) + inv.amountILS;
      return acc;
    }, {} as Record<"Israel" | "Abroad", number>);

  const geographicChartData = Object.entries(geographicData).map(([label, value]) => ({
    label: label === "Israel" ? "ישראל" : "חו\"ל",
    value,
    color: label === "Israel" ? "#3B82F6" : "#10B981",
  }));

  // 2. Distribution of Abroad Investments
  const abroadInvestments = investmentsInILS.filter(inv => inv.category === "Abroad");
  const abroadData = abroadInvestments.reduce((acc, inv) => {
    acc[inv.name] = (acc[inv.name] || 0) + inv.amountILS;
    return acc;
  }, {} as Record<string, number>);

  const abroadChartData = Object.entries(abroadData).map(([label, value], index) => ({
    label,
    value,
    color: `hsl(${120 + index * 40}, 60%, 50%)`,
  }));

  // 3. Distribution of Israel Investments
  const israelInvestments = investmentsInILS.filter(inv => inv.category === "Israel");
  const israelData = israelInvestments.reduce((acc, inv) => {
    acc[inv.name] = (acc[inv.name] || 0) + inv.amountILS;
    return acc;
  }, {} as Record<string, number>);

  const israelChartData = Object.entries(israelData).map(([label, value], index) => ({
    label,
    value,
    color: `hsl(${220 + index * 40}, 60%, 50%)`,
  }));

  // 4. Long-Term vs Short-Term
  const timeHorizonData = investmentsInILS
    .filter(inv => inv.category === "Long-Term" || inv.category === "Short-Term")
    .reduce((acc, inv) => {
      const key = inv.category as "Long-Term" | "Short-Term";
      acc[key] = (acc[key] || 0) + inv.amountILS;
      return acc;
    }, {} as Record<"Long-Term" | "Short-Term", number>);

  const timeHorizonChartData = Object.entries(timeHorizonData).map(([label, value]) => ({
    label: label === "Long-Term" ? "טווח ארוך" : "טווח קצר",
    value,
    color: label === "Long-Term" ? "#8B5CF6" : "#F59E0B",
  }));

  if (investments.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        <p>הוסף השקעות כדי לראות תרשימי פירוט של התיק</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">פירוט תיק ההשקעות</h3>
      
      {geographicChartData.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">ישראל מול חו"ל</h4>
          <PieChart data={geographicChartData} />
        </div>
      )}

      {abroadChartData.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">השקעות חו"ל</h4>
          <PieChart data={abroadChartData} />
        </div>
      )}

      {israelChartData.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">השקעות בישראל</h4>
          <PieChart data={israelChartData} />
        </div>
      )}

      {timeHorizonChartData.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">טווח ארוך מול טווח קצר</h4>
          <PieChart data={timeHorizonChartData} />
        </div>
      )}
    </div>
  );
}
