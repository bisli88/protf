import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AddInvestmentForm } from "./AddInvestmentForm";
import { ExchangeRateSection } from "./ExchangeRateSection";
import { PortfolioCharts, CustomChart } from "./PortfolioCharts";
import { InvestmentsList } from "./InvestmentsList";
import { SignOutButton } from "../SignOutButton";
import { BottomNav } from "./BottomNav";
import { InvestmentCalculator } from "./InvestmentCalculator";
import { ReportView } from "./ReportView";
import { Plus, TrendingUp, Wallet, Award, Eye, EyeOff, User, Settings, Calculator, Globe, History, Clock, MapPin, Trash2, Edit2, Check, X, LayoutGrid } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import * as LucideIcons from "lucide-react";

interface Category {
  _id: Id<"categories">;
  name: string;
  defaultCurrency: "ILS" | "USD";
  includeInStrategy: boolean;
  iconName: string;
  color: string;
}

interface Investment {
  _id: Id<"investments">;
  name: string;
  amount: number;
  initialAmount?: number;
  currency: "ILS" | "USD";
  category: string;
  excludeFromCalculator?: boolean;
}

const ICON_OPTIONS = ["TrendingUp", "Globe", "History", "Clock", "MapPin", "Wallet", "Briefcase", "Diamond", "Gem", "Coins"];

export function PortfolioTracker() {
  const portfolio = useQuery(api.investments.getPortfolio);
  const updateSettings = useMutation(api.investments.updateSettings);
  const addCategory = useMutation(api.investments.addCategory);
  const updateCategory = useMutation(api.investments.updateCategory);
  const deleteCategory = useMutation(api.investments.deleteCategory);
  const seedCategories = useMutation(api.investments.seedCategories);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showChartSettings, setShowChartSettings] = useState(false);
  const [isAddingCustomChart, setIsAddingCustomChart] = useState(false);
  const [newChartTitle, setNewChartTitle] = useState("");
  const [newChartCategories, setNewChartCategories] = useState<string[]>([]);
  
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "list" | "extra" | "report" | "settings">("overview");
  
  // Category editing state
  const [editingCategoryId, setEditingCategoryId] = useState<Id<"categories"> | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryCurrency, setCategoryCurrency] = useState<"ILS" | "USD">("ILS");
  const [categoryStrategy, setCategoryStrategy] = useState(true);
  const [categoryIcon, setCategoryIcon] = useState("MapPin");
  const [categoryColor, setCategoryColor] = useState("blue");
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Local state for strategy management
  const [localStrategyWeights, setLocalStrategyWeights] = useState<Record<string, number>>({});
  const [localInvestmentWeights, setLocalInvestmentWeights] = useState<Record<string, Record<string, number>>>({});
  const [localCustomCharts, setLocalCustomCharts] = useState<CustomChart[]>([]);
  const [strategyTab, setStrategyTab] = useState<"categories" | "detail">("categories");
  const [selectedDetailCat, setSelectedDetailCat] = useState<string>("");

  useEffect(() => {
    if (portfolio?.settings) {
      // Convert array back to object for UI (handles Hebrew keys stored as arrays)
      const weights = Array.isArray(portfolio.settings.strategyWeights)
        ? Object.fromEntries(
            portfolio.settings.strategyWeights.map((w: any) => [w.name, w.percent])
          )
        : portfolio.settings.strategyWeights || {};

      setLocalStrategyWeights(weights);

      const invWeights = portfolio.settings.investmentWeights || {};
      const normalizedInvWeights: Record<string, Record<string, number>> = {};
      Object.entries(invWeights).forEach(([cat, arr]) => {
        if (Array.isArray(arr)) {
          normalizedInvWeights[cat] = Object.fromEntries(
            (arr as any[]).map((w) => [w.name, w.percent])
          );
        } else {
          normalizedInvWeights[cat] = arr as Record<string, number>;
        }
      });

      setLocalInvestmentWeights(normalizedInvWeights);
      setLocalCustomCharts(portfolio.settings.customCharts || []);
    }
    
    // Seed categories if none exist
    if (portfolio && portfolio.categories.length === 0) {
      seedCategories();
    }
  }, [portfolio, seedCategories]);

  if (!portfolio) {
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-[#0A0A0B] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-4"></div>
        <p className="text-[#D4AF37] font-medium">טוען את תיק ההשקעות שלך...</p>
      </div>
    );
  }

  const { investments, categories, exchangeRate, settings } = portfolio;
  const strategyCategories = categories.filter(c => c.includeInStrategy);

  const totalValueILS = investments.reduce((total, investment) => {
    const valueInILS = investment.currency === "USD" 
      ? investment.amount * exchangeRate 
      : investment.amount;
    return total + valueInILS;
  }, 0);

  const portfolioPnl = (() => {
    const withInitial = investments.filter(i => i.initialAmount && i.initialAmount > 0);
    if (withInitial.length === 0) return null;
    const totalCurrent = withInitial.reduce((sum, i) =>
      sum + (i.currency === "USD" ? i.amount * exchangeRate : i.amount), 0);
    const totalInitial = withInitial.reduce((sum, i) =>
      sum + (i.currency === "USD" ? i.initialAmount! * exchangeRate : i.initialAmount!), 0);
    const diff = totalCurrent - totalInitial;
    const pct = (diff / totalInitial) * 100;
    return { diff, pct, isPositive: diff >= 0 };
  })();

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingInvestment(null);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return toast.error("הזן שם לקטגוריה");
    try {
      if (editingCategoryId) {
        await updateCategory({
          id: editingCategoryId,
          name: categoryName,
          defaultCurrency: categoryCurrency,
          includeInStrategy: categoryStrategy,
          iconName: categoryIcon,
          color: categoryColor
        });
        toast.success("קטגוריה עודכנה");
      } else {
        await addCategory({
          name: categoryName,
          defaultCurrency: categoryCurrency,
          includeInStrategy: categoryStrategy,
          iconName: categoryIcon,
          color: categoryColor
        });
        toast.success("קטגוריה נוספה");
      }
      resetCategoryForm();
    } catch (e) {
      toast.error("שמירה נכשלה");
    }
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryCurrency("ILS");
    setCategoryStrategy(true);
    setCategoryIcon("MapPin");
    setCategoryColor("blue");
    setShowAddCategory(false);
  };

  const startEditCategory = (cat: Category) => {
    setEditingCategoryId(cat._id);
    setCategoryName(cat.name);
    setCategoryCurrency(cat.defaultCurrency);
    setCategoryStrategy(cat.includeInStrategy);
    setCategoryIcon(cat.iconName);
    setCategoryColor(cat.color);
    setShowAddCategory(true);
  };

  const handleDeleteCategory = async (id: Id<"categories">) => {
    if (confirm("האם למחוק קטגוריה זו? השקעות קיימות בקטגוריה זו לא יימחקו.")) {
      try {
        await deleteCategory({ id });
        toast.success("קטגוריה נמחקה");
      } catch (e) {
        toast.error("מחיקה נכשלה");
      }
    }
  };

  const saveStrategy = async () => {
    try {
      // Convert object with Hebrew keys to arrays to avoid Convex field name restriction
      const strategyWeightsArray = Object.entries(localStrategyWeights).map(
        ([name, percent]) => ({ name, percent: Number(percent) })
      );

      const investmentWeightsArray: Record<string, { name: string; percent: number }[]> = {};
      Object.entries(localInvestmentWeights).forEach(([catName, weights]) => {
        investmentWeightsArray[catName] = Object.entries(weights).map(
          ([name, percent]) => ({ name, percent: Number(percent) })
        );
      });

      await updateSettings({
        strategyWeights: strategyWeightsArray,
        investmentWeights: investmentWeightsArray,
      });
      toast.success("אסטרטגיה נשמרה");
      setShowStrategyModal(false);
    } catch (e) {
      console.error("Strategy save error:", e);
      toast.error("שמירה נכשלה");
    }
  };

  const saveChartSettings = async (charts: CustomChart[]) => {
    try {
      await updateSettings({
        customCharts: charts
      });
      toast.success("הגדרות גרפים עודכנו");
    } catch (e) {
      toast.error("שמירה נכשלה");
    }
  };

  const toggleChart = (chartId: string, title: string, type: "categories" | "single-category", selectedCategories: string[]) => {
    const exists = localCustomCharts.find(c => c.id === chartId);
    let newCharts: CustomChart[];
    if (exists) {
      newCharts = localCustomCharts.filter(c => c.id !== chartId);
    } else {
      newCharts = [...localCustomCharts, { id: chartId, title, type, selectedCategories }];
    }
    setLocalCustomCharts(newCharts);
    saveChartSettings(newCharts);
  };

  const handleAddCustomChart = () => {
    if (!newChartTitle.trim()) return toast.error("הזן שם לגרף");
    if (newChartCategories.length === 0) return toast.error("בחר לפחות קטגוריה אחת");

    const newChart: CustomChart = {
      id: `custom_${Date.now()}`,
      title: newChartTitle,
      type: "categories",
      selectedCategories: newChartCategories
    };

    const newCharts = [...localCustomCharts, newChart];
    setLocalCustomCharts(newCharts);
    saveChartSettings(newCharts);
    
    // Reset form
    setNewChartTitle("");
    setNewChartCategories([]);
    setIsAddingCustomChart(false);
  };

  const deleteCustomChart = (id: string) => {
    const newCharts = localCustomCharts.filter(c => c.id !== id);
    setLocalCustomCharts(newCharts);
    saveChartSettings(newCharts);
  };

  const renderView = () => {
    switch (activeView) {
      case "overview":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl relative">
              <button 
                onClick={() => setShowChartSettings(true)}
                className="absolute top-6 left-6 text-zinc-500 hover:text-[#D4AF37] transition-colors"
              >
                <LayoutGrid size={20} />
              </button>
              <PortfolioCharts 
                investments={investments} 
                categories={categories}
                exchangeRate={exchangeRate} 
                isPrivate={isPrivate}
                customCharts={localCustomCharts}
              />
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl">
              <ExchangeRateSection 
                exchangeRate={exchangeRate}
                lastUpdated={portfolio.lastUpdated}
              />
            </div>
          </div>
        );
      case "list":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-1 shadow-xl">
              <InvestmentsList 
                investments={investments} 
                categories={categories}
                exchangeRate={exchangeRate} 
                onEdit={handleEdit}
                isPrivate={isPrivate}
              />
            </div>
            <div className="h-24"></div>
          </div>
        );
      case "extra":
        return (
          <div className="space-y-6 animate-fade-in">
            <button
              onClick={() => setShowStrategyModal(true)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl flex items-center justify-between group hover:border-[#D4AF37]/50 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="bg-[#D4AF37]/10 p-3 rounded-2xl group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} className="text-[#D4AF37]" />
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-black text-white">אסטרטגיית תיק</h3>
                  <p className="text-zinc-500 text-xs font-bold">הגדר יעדים וחלוקה אידיאלית</p>
                </div>
              </div>
              <div className="bg-zinc-800 p-2 rounded-full text-zinc-400 group-hover:text-[#D4AF37] transition-colors">
                <Settings size={20} />
              </div>
            </button>

            <InvestmentCalculator 
              settings={settings} 
              investments={investments} 
              categories={categories}
              exchangeRate={exchangeRate}
            />
          </div>
        );
      // בתוך renderView() הוסף case:
      case "report":
        return (
          <ReportView
            investments={investments}
            categories={categories}
            exchangeRate={exchangeRate}
          />
        );
      case "settings":
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-[#D4AF37]/10 p-2 rounded-xl">
                    <Settings size={20} className="text-[#D4AF37]" />
                  </div>
                  <h3 className="text-xl font-black text-white">ניהול קטגוריות</h3>
                </div>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="bg-[#D4AF37] text-black p-2 rounded-xl hover:scale-105 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>

              {showAddCategory && (
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-4 mb-6 space-y-4 animate-in slide-in-from-top">
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="שם הקטגוריה"
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 rounded-xl text-white font-bold outline-none focus:border-[#D4AF37]"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase">מטבע ברירת מחדל</label>
                      <select
                        value={categoryCurrency}
                        onChange={(e) => setCategoryCurrency(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 rounded-xl text-white font-bold outline-none"
                      >
                        <option value="ILS">₪ ILS</option>
                        <option value="USD">$ USD</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase">כלול באסטרטגיה</label>
                      <button
                        onClick={() => setCategoryStrategy(!categoryStrategy)}
                        className={`w-full py-3 rounded-xl font-bold transition-all ${categoryStrategy ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}
                      >
                        {categoryStrategy ? 'כלול' : 'מוחרג'}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase">אייקון</label>
                    <div className="flex flex-wrap gap-2">
                      {ICON_OPTIONS.map(icon => {
                        const Icon = (LucideIcons as any)[icon];
                        return (
                          <button
                            key={icon}
                            onClick={() => setCategoryIcon(icon)}
                            className={`p-2 rounded-lg border transition-all ${categoryIcon === icon ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                          >
                            <Icon size={16} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSaveCategory} className="flex-1 bg-[#D4AF37] text-black py-3 rounded-xl font-black">שמור</button>
                    <button onClick={resetCategoryForm} className="px-4 bg-zinc-700 text-white py-3 rounded-xl font-black"><X size={20}/></button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {categories.map(cat => {
                  const Icon = (LucideIcons as any)[cat.iconName] || Globe;
                  return (
                    <div key={cat._id} className="flex items-center justify-between p-4 bg-zinc-800/30 border border-zinc-800 rounded-2xl group">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg bg-zinc-800 text-${cat.color}-400`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="text-white font-bold">{cat.name}</p>
                          <p className="text-[9px] text-zinc-500 font-black uppercase">
                            {cat.defaultCurrency} • {cat.includeInStrategy ? 'IN STRATEGY' : 'EXCLUDED'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEditCategory(cat)} className="p-2 text-zinc-400 hover:text-[#D4AF37]"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteCategory(cat._id)} className="p-2 text-zinc-400 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl">
              <div className="flex flex-col items-center gap-6">
                <div className="bg-zinc-800 p-6 rounded-full border border-zinc-700">
                  <User size={48} className="text-[#D4AF37]" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white mb-2">הגדרות חשבון</h3>
                  <p className="text-zinc-500 text-sm">נהל את החשבון והעדפות האפליקציה</p>
                </div>
                <div className="pt-8 w-full">
                  <SignOutButton />
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-[#0A0A0B] min-h-screen pb-32">
      <div className="px-6 pt-12 pb-14 bg-zinc-900/50 border-b border-zinc-800 rounded-b-[3rem] shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4AF37]/5 rounded-full blur-3xl -ml-16 -mb-16"></div>
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center gap-2 mb-4 bg-zinc-800/50 px-4 py-1.5 rounded-full border border-zinc-700/50">
            <Award size={14} className="text-[#D4AF37]" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D4AF37]">Wealth Portfolio</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <p className="text-sm font-medium text-zinc-500 mb-2 flex items-center gap-2">
              שווי התיק הכולל שלך
              <button onClick={() => setIsPrivate(!isPrivate)} className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-[#D4AF37]">
                {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </p>
            <p className={`text-6xl font-black text-white tracking-tighter transition-all duration-500 ${isPrivate ? 'blur-xl' : ''}`}>
              <span className="text-2xl font-normal text-[#D4AF37] ml-2">₪</span>
              {totalValueILS.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>

            {portfolioPnl && (
              <div className={`flex items-center justify-center gap-3 mt-3 transition-all duration-500 ${isPrivate ? 'blur-xl' : ''}`}>
                <span className={`text-sm font-black ${portfolioPnl.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {portfolioPnl.isPositive ? '▲' : '▼'} {Math.abs(portfolioPnl.pct).toFixed(1)}%
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                  portfolioPnl.isPositive 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}>
                  {portfolioPnl.isPositive ? '+' : ''}₪{Math.abs(portfolioPnl.diff).toLocaleString('he-IL', { maximumFractionDigits: 0 })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4">{renderView()}</div>

      {activeView === "list" && (
        <div className="fixed bottom-28 right-0 left-0 flex justify-center z-40 px-6 pointer-events-none animate-in fade-in zoom-in duration-300">
          <button onClick={() => setShowAddForm(true)} className="pointer-events-auto bg-gold-gradient text-black shadow-[0_10px_40px_-10px_rgba(212,175,55,0.4)] flex items-center gap-2 px-6 py-3 rounded-full font-black text-sm transition-all hover:scale-105 active:scale-95 group">
            <Plus size={18} className="stroke-[3px]" />
            <span>הוסף השקעה חדשה</span>
          </button>
        </div>
      )}

      <BottomNav activeView={activeView} onViewChange={setActiveView} />

      {showAddForm && (
        <AddInvestmentForm 
          onClose={handleCloseForm}
          onSuccess={handleCloseForm}
          investment={editingInvestment || undefined}
          categories={categories}
        />
      )}

      {showStrategyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowStrategyModal(false)}/>
          <div className="relative w-full max-w-lg bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="bg-[#D4AF37]/10 p-2 rounded-xl">
                  <TrendingUp size={20} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-black text-white">אסטרטגיית תיק</h3>
              </div>
              <button onClick={() => setShowStrategyModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 pb-0 flex gap-2">
              <button
                onClick={() => setStrategyTab("categories")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${strategyTab === "categories" ? "bg-[#D4AF37] text-black" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
              >
                חלוקת קטגוריות
              </button>
              <button
                onClick={() => {
                  setStrategyTab("detail");
                  if (!selectedDetailCat && strategyCategories.length > 0) {
                    setSelectedDetailCat(strategyCategories[0].name);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${strategyTab === "detail" ? "bg-[#D4AF37] text-black" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"}`}
              >
                פירוט קטגוריה
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 overflow-y-auto pb-12 flex-1">

              {/* ── TAB 1: Category weights ── */}
              {strategyTab === "categories" && (
                <div className="space-y-5 animate-in fade-in duration-200">

                  {/* Live Pie */}
                  <div className="flex justify-center">
                    <div className="relative w-36 h-36">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        {(() => {
                          const total = strategyCategories.reduce((a, cat) => a + (localStrategyWeights[cat.name] || 0), 0);
                          let offset = 0;
                          const colors = ["#D4AF37","#10b981","#6366f1","#f97316","#ec4899","#06b6d4","#8b5cf6"];
                          return strategyCategories.map((cat, i) => {
                            const pct = total > 0 ? ((localStrategyWeights[cat.name] || 0) / total) * 100 : 0;
                            const el = (
                              <circle
                                key={cat._id}
                                cx="18" cy="18" r="15.9"
                                fill="transparent"
                                stroke={colors[i % colors.length]}
                                strokeWidth="3.2"
                                strokeDasharray={`${pct} ${100 - pct}`}
                                strokeDashoffset={-offset}
                              />
                            );
                            offset += pct;
                            return el;
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {(() => {
                          const total = strategyCategories.reduce((a, cat) => a + (localStrategyWeights[cat.name] || 0), 0);
                          const isValid = Math.abs(total - 100) < 0.1;
                          return (
                            <>
                              <span className={`text-xl font-black ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>{Math.round(total)}%</span>
                              <span className="text-[9px] text-zinc-500 font-bold">{isValid ? '✓ מאוזן' : 'חסר'}</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
                    {(() => {
                      const colors = ["#D4AF37","#10b981","#6366f1","#f97316","#ec4899","#06b6d4","#8b5cf6"];
                      return strategyCategories.map((cat, i) => (
                        <div key={cat._id} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                          <span className="text-[10px] text-zinc-400 font-bold">{cat.name}</span>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Auto-distribute */}
                  <button
                    onClick={() => {
                      const count = strategyCategories.length;
                      if (!count) return;
                      const even = Math.floor(100 / count);
                      const newWeights: Record<string, number> = {};
                      strategyCategories.forEach((cat, i) => {
                        newWeights[cat.name] = even + (i === 0 ? 100 - even * count : 0);
                      });
                      setLocalStrategyWeights(newWeights);
                    }}
                    className="w-full py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-black hover:border-[#D4AF37]/50 hover:text-[#D4AF37] transition-all"
                  >
                    ⚖️ חלוקה שווה אוטומטית
                  </button>

                  {/* Sliders */}
                  <div className="space-y-3">
                    {strategyCategories.map((cat, i) => {
                      const colors = ["#D4AF37","#10b981","#6366f1","#f97316","#ec4899","#06b6d4","#8b5cf6"];
                      const color = colors[i % colors.length];
                      const val = localStrategyWeights[cat.name] || 0;
                      return (
                        <div key={cat._id} className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800/50">
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                              <span className="text-white font-bold text-sm">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setLocalStrategyWeights(prev => ({ ...prev, [cat.name]: Math.max(0, (prev[cat.name] || 0) - 1) }))}
                                className="w-7 h-7 rounded-lg bg-zinc-700 text-white font-black hover:bg-zinc-600 transition-colors flex items-center justify-center"
                              >−</button>
                              <input
                                type="number"
                                value={val}
                                onChange={(e) => setLocalStrategyWeights(prev => ({ ...prev, [cat.name]: Number(e.target.value) }))}
                                className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded-lg w-14 text-center font-black text-xs outline-none focus:border-[#D4AF37]"
                                style={{ color }}
                              />
                              <button
                                onClick={() => setLocalStrategyWeights(prev => ({ ...prev, [cat.name]: Math.min(100, (prev[cat.name] || 0) + 1) }))}
                                className="w-7 h-7 rounded-lg bg-zinc-700 text-white font-black hover:bg-zinc-600 transition-colors flex items-center justify-center"
                              >+</button>
                            </div>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-200"
                              style={{ width: `${Math.min(val, 100)}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── TAB 2: Per-category detail ── */}
              {strategyTab === "detail" && (
                <div className="space-y-5 animate-in fade-in duration-200">

                  {/* Category selector pills */}
                  <div className="flex flex-wrap gap-2">
                    {strategyCategories.map(cat => {
                      const weights = localInvestmentWeights[cat.name] || {};
                      const sum = Object.values(weights).reduce((a: number, b) => a + (b as number), 0);
                      const isValid = Math.abs(sum - 100) < 0.1;
                      const hasInvestments = investments.some(inv => inv.category === cat.name && !inv.excludeFromCalculator);
                      if (!hasInvestments) return null;
                      return (
                        <button
                          key={cat._id}
                          onClick={() => setSelectedDetailCat(cat.name)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-1.5 ${selectedDetailCat === cat.name ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
                        >
                          {cat.name}
                          <span className={`text-[9px] font-black ${selectedDetailCat === cat.name ? 'text-black/60' : isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isValid ? '✓' : `${Math.round(sum)}%`}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected category investments */}
                  {selectedDetailCat && (() => {
                    const cat = strategyCategories.find(c => c.name === selectedDetailCat);
                    if (!cat) return null;
                    const catInvestments = investments.filter(inv => inv.category === selectedDetailCat && !inv.excludeFromCalculator);
                    const weights = localInvestmentWeights[selectedDetailCat] || {};
                    const sum = Object.values(weights).reduce((a: number, b) => a + (b as number), 0);
                    const isValid = Math.abs(sum - 100) < 0.1;

                    return (
                      <div className="space-y-4">
                        {/* Section progress bar */}
                        <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-800/50 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">סה"כ מוקצה</span>
                            <span className={`text-sm font-black px-2 py-0.5 rounded-full ${isValid ? 'bg-emerald-500/20 text-emerald-400' : sum > 100 ? 'bg-red-500/20 text-red-400' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                              {Math.round(sum)}% {isValid ? '✓' : ''}
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${isValid ? 'bg-emerald-500' : sum > 100 ? 'bg-red-500' : 'bg-[#D4AF37]'}`}
                              style={{ width: `${Math.min(sum, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Auto-distribute */}
                        <button
                          onClick={() => {
                            const count = catInvestments.length;
                            if (!count) return;
                            const even = Math.floor(100 / count);
                            const newW: Record<string, number> = {};
                            catInvestments.forEach((inv, i) => {
                              newW[inv.name] = even + (i === 0 ? 100 - even * count : 0);
                            });
                            setLocalInvestmentWeights(prev => ({ ...prev, [selectedDetailCat]: newW }));
                          }}
                          className="w-full py-2 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 text-[10px] font-black hover:border-emerald-500/30 hover:text-emerald-400 transition-all"
                        >
                          ⚖️ חלוקה שווה ב{selectedDetailCat}
                        </button>

                        {/* Investments */}
                        <div className="space-y-2">
                          {catInvestments.map(inv => {
                            const val = weights[inv.name] || 0;
                            return (
                              <div key={inv._id} className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-800/50">
                                <div className="flex justify-between items-center mb-2">
                                  <span className="text-zinc-300 font-bold text-sm truncate max-w-[140px]">{inv.name}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setLocalInvestmentWeights(prev => ({
                                        ...prev,
                                        [selectedDetailCat]: { ...(prev[selectedDetailCat] || {}), [inv.name]: Math.max(0, (prev[selectedDetailCat]?.[inv.name] || 0) - 1) }
                                      }))}
                                      className="w-7 h-7 rounded-lg bg-zinc-700 text-white font-black text-sm hover:bg-zinc-600 flex items-center justify-center"
                                    >−</button>
                                    <input
                                      type="number"
                                      value={val}
                                      onChange={(e) => setLocalInvestmentWeights(prev => ({
                                        ...prev,
                                        [selectedDetailCat]: { ...(prev[selectedDetailCat] || {}), [inv.name]: Number(e.target.value) }
                                      }))}
                                      className="bg-zinc-900 border border-zinc-700 px-2 py-1 rounded-lg w-14 text-center text-emerald-400 font-black text-xs outline-none"
                                    />
                                    <button
                                      onClick={() => setLocalInvestmentWeights(prev => ({
                                        ...prev,
                                        [selectedDetailCat]: { ...(prev[selectedDetailCat] || {}), [inv.name]: Math.min(100, (prev[selectedDetailCat]?.[inv.name] || 0) + 1) }
                                      }))}
                                      className="w-7 h-7 rounded-lg bg-zinc-700 text-white font-black text-sm hover:bg-zinc-600 flex items-center justify-center"
                                    >+</button>
                                  </div>
                                </div>
                                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500/70 rounded-full transition-all duration-200"
                                    style={{ width: `${Math.min(val, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 mt-auto">
              <button onClick={saveStrategy} className="w-full font-black py-4 rounded-2xl bg-[#D4AF37] text-black hover:bg-[#B8962F] transition-all shadow-lg shadow-[#D4AF37]/20">
                שמור אסטרטגיה
              </button>
            </div>
          </div>
        </div>
      )}

      {showChartSettings && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowChartSettings(false)}/>
          <div className="relative w-full max-w-lg bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="bg-[#D4AF37]/10 p-2 rounded-xl">
                  <LayoutGrid size={20} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-black text-white">התאמת גרפים</h3>
              </div>
              <button 
                onClick={() => setIsAddingCustomChart(!isAddingCustomChart)}
                className={`p-2 rounded-xl transition-all ${isAddingCustomChart ? 'bg-red-500/20 text-red-500 rotate-45' : 'bg-[#D4AF37] text-black'}`}
              >
                <Plus size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 pb-12">
              {isAddingCustomChart && (
                <div className="bg-zinc-800/50 border border-[#D4AF37]/30 rounded-3xl p-5 space-y-4 animate-in slide-in-from-top duration-300">
                  <h4 className="text-white font-black text-sm mb-2">גרף מותאם אישית חדש</h4>
                  <input
                    type="text"
                    value={newChartTitle}
                    onChange={(e) => setNewChartTitle(e.target.value)}
                    placeholder="שם הגרף (למשל: נדלן ומזומן)"
                    className="w-full bg-zinc-900 border border-zinc-700 px-4 py-3 rounded-xl text-white font-bold outline-none focus:border-[#D4AF37]"
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">בחר קטגוריות לשילוב:</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <button
                          key={cat._id}
                          onClick={() => {
                            if (newChartCategories.includes(cat.name)) {
                              setNewChartCategories(newChartCategories.filter(c => c !== cat.name));
                            } else {
                              setNewChartCategories([...newChartCategories, cat.name]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${newChartCategories.includes(cat.name) ? 'bg-[#D4AF37] border-[#D4AF37] text-black' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={handleAddCustomChart}
                    className="w-full bg-[#D4AF37] text-black py-3 rounded-xl font-black text-sm mt-2"
                  >
                    צור גרף
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">גרפים מובנים:</p>
                
                <button
                  onClick={() => toggleChart("strategy", "הקצאת אסטרטגיה", "categories", strategyCategories.map(c => c.name))}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${localCustomCharts.some(c => c.id === "strategy") ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-zinc-800/30 border-zinc-800 text-zinc-400'}`}
                >
                  <span className="font-bold">הקצאת אסטרטגיה</span>
                  {localCustomCharts.some(c => c.id === "strategy") ? <Check size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                </button>

                <button
                  onClick={() => toggleChart("all_categories", "כלל התיק לפי קטגוריות", "categories", categories.map(c => c.name))}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${localCustomCharts.some(c => c.id === "all_categories") ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-zinc-800/30 border-zinc-800 text-zinc-400'}`}
                >
                  <span className="font-bold">כלל התיק לפי קטגוריות</span>
                  {localCustomCharts.some(c => c.id === "all_categories") ? <Check size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                </button>
              </div>

              {localCustomCharts.filter(c => c.id.startsWith("custom_")).length > 0 && (
                <div className="space-y-4">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">גרפים מותאמים אישית:</p>
                  <div className="space-y-3">
                    {localCustomCharts.filter(c => c.id.startsWith("custom_")).map(chart => (
                      <div key={chart.id} className="w-full p-4 rounded-2xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 flex items-center justify-between text-[#D4AF37]">
                        <div>
                          <p className="font-bold">{chart.title}</p>
                          <p className="text-[9px] opacity-70">{chart.selectedCategories.join(", ")}</p>
                        </div>
                        <button 
                          onClick={() => deleteCustomChart(chart.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">פירוט לפי קטגוריה:</p>
                <div className="space-y-3">
                  {categories.map(cat => (
                    <button
                      key={cat._id}
                      onClick={() => toggleChart(`cat_${cat._id}`, `פירוט ${cat.name}`, "single-category", [cat.name])}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between ${localCustomCharts.some(c => c.id === `cat_${cat._id}`) ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]' : 'bg-zinc-800/30 border-zinc-800 text-zinc-400'}`}
                    >
                      <span className="font-bold">פירוט {cat.name}</span>
                      {localCustomCharts.some(c => c.id === `cat_${cat._id}`) ? <Check size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-700" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 mt-auto">
              <button onClick={() => setShowChartSettings(false)} className="w-full font-black py-4 rounded-2xl bg-[#D4AF37] text-black hover:bg-[#B8962F] transition-all">סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}