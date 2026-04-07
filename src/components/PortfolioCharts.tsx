import { PieChart } from "./PieChart";

interface Category {
  name: string;
  includeInStrategy: boolean;
  color: string;
}

interface Investment {
  name: string;
  amount: number;
  currency: "ILS" | "USD";
  category: string;
  excludeFromCalculator?: boolean;
}

export interface CustomChart {
  id: string;
  title: string;
  type: "categories" | "single-category";
  selectedCategories: string[];
}

interface PortfolioChartsProps {
  investments: Investment[];
  categories: Category[];
  exchangeRate: number;
  isPrivate: boolean;
  customCharts?: CustomChart[];
}

export function PortfolioCharts({ investments, categories, exchangeRate, isPrivate, customCharts }: PortfolioChartsProps) {
  // Convert all amounts to ILS for calculations
  const investmentsInILS = investments
  .filter(inv => !inv.excludeFromCalculator)
  .map(inv => ({
    ...inv,
    amountILS: inv.currency === "USD" ? inv.amount * exchangeRate : inv.amount,
  }));

  if (investments.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-gray-500">
        <p>הוסף השקעות כדי לראות תרשימי פירוט של התיק</p>
      </div>
    );
  }

  const renderChart = (chart: { title: string; data: any[] }) => (
    <div key={chart.title} className="bg-zinc-800/20 p-5 rounded-[2.5rem] border border-zinc-800/50 min-w-[280px] snap-center">
      <h4 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest mb-4 flex items-center gap-2">
        {chart.title}
      </h4>
      <PieChart data={chart.data} isPrivate={isPrivate} />
    </div>
  );

  const getStrategyChartData = () => {
    const strategyCategories = categories.filter(c => c.includeInStrategy).map(c => c.name);
    const strategyData = investmentsInILS
      .filter(inv => strategyCategories.includes(inv.category))
      .reduce((acc, inv) => {
        acc[inv.category] = (acc[inv.category] || 0) + inv.amountILS;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(strategyData).map(([label, value]) => {
      const cat = categories.find(c => c.name === label);
      return {
        label,
        value,
        color: cat?.color === "blue" ? "#3B82F6" : 
               cat?.color === "emerald" ? "#10B981" :
               cat?.color === "purple" ? "#8B5CF6" :
               cat?.color === "orange" ? "#F59E0B" : "#6366F1",
      };
    });
  };

  const getAllCategoryChartData = () => {
    const allCategoryData = investmentsInILS.reduce((acc, inv) => {
      acc[inv.category] = (acc[inv.category] || 0) + inv.amountILS;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(allCategoryData).map(([label, value], index) => ({
      label,
      value,
      color: `hsl(${index * (360 / Math.max(1, categories.length))}, 60%, 50%)`,
    }));
  };

  const getCategoryBreakdownData = (categoryName: string) => {
    const catInvestments = investmentsInILS.filter(inv => inv.category === categoryName);
    if (catInvestments.length === 0) return null;

    const data = catInvestments.reduce((acc, inv) => {
      acc[inv.name] = (acc[inv.name] || 0) + inv.amountILS;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(data).map(([label, value], index) => ({
      label,
      value,
      color: `hsl(${index * 40}, 60%, 50%)`,
    }));
  };

  // If we have custom charts, use them
  if (customCharts && customCharts.length > 0) {
    return (
      <div className="px-0 py-2">
        <h3 className="text-xl font-black text-white mb-6 px-2 tracking-tight underline decoration-[#D4AF37]/30 decoration-4 underline-offset-8">ניתוח תיק</h3>
        <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 scrollbar-hide snap-x snap-mandatory">
          {customCharts.map(cc => {
            let data: any[] = [];
            if (cc.type === "categories") {
              const categoryData = investmentsInILS
                .filter(inv => cc.selectedCategories.includes(inv.category))
                .reduce((acc, inv) => {
                  acc[inv.category] = (acc[inv.category] || 0) + inv.amountILS;
                  return acc;
                }, {} as Record<string, number>);
              
              data = Object.entries(categoryData).map(([label, value], index) => ({
                label,
                value,
                color: `hsl(${index * (360 / Math.max(1, cc.selectedCategories.length))}, 60%, 50%)`,
              }));
            } else if (cc.type === "single-category" && cc.selectedCategories.length > 0) {
              data = getCategoryBreakdownData(cc.selectedCategories[0]) || [];
            }

            if (data.length === 0) return null;
            return renderChart({ title: cc.title, data });
          })}
        </div>
      </div>
    );
  }

  // Fallback to default charts
  const strategyChartData = getStrategyChartData();
  const allCategoryChartData = getAllCategoryChartData();
  const categoryBreakdowns = categories.map(cat => ({
    categoryName: cat.name,
    chartData: getCategoryBreakdownData(cat.name)
  })).filter(b => b.chartData !== null);

  return (
    <div className="px-0 py-2">
      <h3 className="text-xl font-black text-white mb-6 px-2 tracking-tight underline decoration-[#D4AF37]/30 decoration-4 underline-offset-8">ניתוח תיק</h3>
      
      <div className="flex gap-4 overflow-x-auto pb-6 -mx-2 px-2 scrollbar-hide snap-x snap-mandatory">
        {strategyChartData.length > 0 && renderChart({ title: "הקצאת אסטרטגיה", data: strategyChartData })}
        {renderChart({ title: "כלל התיק לפי קטגוריות", data: allCategoryChartData })}
        {categoryBreakdowns.map((breakdown) => 
          renderChart({ title: `פירוט ${breakdown.categoryName}`, data: breakdown.chartData! })
        )}
      </div>
    </div>
  );
}

