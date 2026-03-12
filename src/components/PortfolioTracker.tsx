import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { toast } from "sonner";
import { AddInvestmentForm } from "./AddInvestmentForm";
import { ExchangeRateSection } from "./ExchangeRateSection";
import { PortfolioCharts } from "./PortfolioCharts";
import { InvestmentsList } from "./InvestmentsList";
import { SignOutButton } from "../SignOutButton";
import { BottomNav } from "./BottomNav";
import { InvestmentCalculator } from "./InvestmentCalculator";
import { Plus, TrendingUp, Wallet, Award, Eye, EyeOff, User, Settings, Calculator } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";

interface Investment {
  _id: Id<"investments">;
  name: string;
  amount: number;
  currency: "ILS" | "USD";
  category: "Israel" | "Abroad" | "Long-Term" | "Short-Term";
  excludeFromCalculator?: boolean;
}

export function PortfolioTracker() {
  const portfolio = useQuery(api.investments.getPortfolio);
  const updateSettings = useMutation(api.investments.updateSettings);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [activeView, setActiveView] = useState<"overview" | "list" | "extra" | "settings">("overview");
  
  // Local state for smooth slider dragging
  const [localIdealIsrael, setLocalIdealIsrael] = useState<number | null>(null);
  const [localAbroadIdeals, setLocalAbroadIdeals] = useState<Record<string, number>>({});
  const [localIsraelIdeals, setLocalIsraelIdeals] = useState<Record<string, number>>({});

  if (!portfolio) {
    return (
      <div className="flex flex-col justify-center items-center py-20 bg-[#0A0A0B] min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#D4AF37] mb-4"></div>
        <p className="text-[#D4AF37] font-medium">טוען את תיק ההשקעות שלך...</p>
      </div>
    );
  }

  const { investments, exchangeRate, settings } = portfolio;
  const abroadInvestments = investments.filter(inv => inv.category === "Abroad" && !inv.excludeFromCalculator);
  const israelInvestments = investments.filter(inv => inv.category === "Israel" && !inv.excludeFromCalculator);

  const totalValueILS = investments.reduce((total, investment) => {
    const valueInILS = investment.currency === "USD" 
      ? investment.amount * exchangeRate 
      : investment.amount;
    return total + valueInILS;
  }, 0);

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment);
    setShowAddForm(true);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingInvestment(null);
  };

  const handleUpdateIdealIsrael = async (percent: number) => {
    try {
      await updateSettings({ idealIsraelPercent: percent });
      toast.success("הגדרות עודכנו");
    } catch (e) {
      toast.error("עדכון נכשל");
    }
  };

  const handleUpdateAbroadIdeal = async (name: string, percent: number) => {
    try {
      const currentAbroadIdeals = Array.isArray(settings.abroadIdeals) ? [...settings.abroadIdeals] : [];
      const index = currentAbroadIdeals.findIndex(item => item.name === name);
      if (index > -1) {
        currentAbroadIdeals[index] = { name, percent };
      } else {
        currentAbroadIdeals.push({ name, percent });
      }
      await updateSettings({ abroadIdeals: currentAbroadIdeals });
      toast.success(`יעד עבור ${name} עודכן`);
    } catch (e) {
      toast.error("עדכון נכשל");
    }
  };

  const handleUpdateIsraelIdeal = async (name: string, percent: number) => {
    try {
      const currentIsraelIdeals = Array.isArray(settings.israelIdeals) ? [...settings.israelIdeals] : [];
      const index = currentIsraelIdeals.findIndex(item => item.name === name);
      if (index > -1) {
        currentIsraelIdeals[index] = { name, percent };
      } else {
        currentIsraelIdeals.push({ name, percent });
      }
      await updateSettings({ israelIdeals: currentIsraelIdeals });
      toast.success(`יעד עבור ${name} עודכן`);
    } catch (e) {
      toast.error("עדכון נכשל");
    }
  };

  const renderView = () => {
    // Defensive check: ensure ideals are arrays before rendering
    const sanitizedAbroadIdeals = Array.isArray(settings?.abroadIdeals) ? settings.abroadIdeals : [];
    const sanitizedIsraelIdeals = Array.isArray(settings?.israelIdeals) ? settings.israelIdeals : [];

    switch (activeView) {
      case "overview":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Charts Section */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-xl">
              <PortfolioCharts 
                investments={investments} 
                exchangeRate={exchangeRate} 
                isPrivate={isPrivate}
              />
            </div>

            {/* Exchange Rate Section */}
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
            {/* Investments List */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-1 shadow-xl">
              <InvestmentsList 
                investments={investments} 
                exchangeRate={exchangeRate} 
                onEdit={handleEdit}
                isPrivate={isPrivate}
              />
            </div>

            {/* Add Button Placeholder - actual button is floating */}
            <div className="h-24"></div>
          </div>
        );
      case "extra":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Strategy Toggle Button */}
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
              exchangeRate={exchangeRate}
            />
          </div>
        );
      case "settings":
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Account Settings */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-xl">
              <div className="flex flex-col items-center gap-6">
                <div className="bg-zinc-800 p-6 rounded-full border border-zinc-700">
                  <User size={48} className="text-[#D4AF37]" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-white mb-2">הגדרות חשבון</h3>
                  <p className="text-zinc-500 text-sm">נהל את החשבון והעדפות האפליקציה</p>
                </div>
                
                <div className="w-full space-y-4 pt-4 border-t border-zinc-800">
                  <div className="flex items-center justify-between p-4 bg-zinc-800/30 rounded-2xl">
                    <span className="text-zinc-300 font-medium">מטבע ברירת מחדל</span>
                    <span className="text-[#D4AF37] font-black">₪ (ILS)</span>
                  </div>
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
      {/* Premium Header Card */}
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
              <button 
                onClick={() => setIsPrivate(!isPrivate)}
                className="p-1.5 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-[#D4AF37]"
              >
                {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </p>
            <p className={`text-6xl font-black text-white tracking-tighter transition-all duration-500 ${isPrivate ? 'blur-xl' : ''}`}>
              <span className="text-2xl font-normal text-[#D4AF37] ml-2">₪</span>
              {totalValueILS.toLocaleString('he-IL', { 
                minimumFractionDigits: 0, 
                maximumFractionDigits: 0 
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4">
        {renderView()}
      </div>

      {/* Luxury Floating Add Button - Only show on list view */}
      {activeView === "list" && (
        <div className="fixed bottom-28 right-0 left-0 flex justify-center z-40 px-6 pointer-events-none animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => setShowAddForm(true)}
            className="pointer-events-auto bg-gold-gradient text-black shadow-[0_10px_40px_-10px_rgba(212,175,55,0.4)] flex items-center gap-3 px-10 py-5 rounded-full font-black text-lg transition-all hover:scale-105 active:scale-95 group"
          >
            <Plus size={24} className="stroke-[3px]" />
            <span>הוסף השקעה חדשה</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <BottomNav activeView={activeView} onViewChange={setActiveView} />

      {/* Modal Backdrop and Form */}
      {showAddForm && (
        <AddInvestmentForm 
          onClose={handleCloseForm}
          onSuccess={handleCloseForm}
          investment={editingInvestment || undefined}
        />
      )}

      {/* Strategy Settings Modal */}
      {showStrategyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            onClick={() => setShowStrategyModal(false)}
          />
          <div className="relative w-full max-w-lg bg-zinc-900 border-t sm:border border-zinc-800 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 sticky top-0 z-10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="bg-[#D4AF37]/10 p-2 rounded-xl">
                  <TrendingUp size={20} className="text-[#D4AF37]" />
                </div>
                <h3 className="text-xl font-black text-white">אסטרטגיית תיק</h3>
              </div>
              <button 
                onClick={() => setShowStrategyModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
              >
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-8 pb-12">
              {/* Category Sum Calculation */}
              {(() => {
                const abroadSum = abroadInvestments.reduce((sum, inv) => {
                  return sum + (localAbroadIdeals[inv.name] ?? (Array.isArray(settings.abroadIdeals) ? settings.abroadIdeals.find(i => i.name === inv.name)?.percent || 0 : 0));
                }, 0);
                const israelSum = israelInvestments.reduce((sum, inv) => {
                  return sum + (localIsraelIdeals[inv.name] ?? (Array.isArray(settings.israelIdeals) ? settings.israelIdeals.find(i => i.name === inv.name)?.percent || 0 : 0));
                }, 0);
                
                const isAbroadValid = abroadInvestments.length === 0 || Math.abs(abroadSum - 100) < 0.1;
                const isIsraelValid = israelInvestments.length === 0 || Math.abs(israelSum - 100) < 0.1;
                const isValid = isAbroadValid && isIsraelValid;

                const sanitizedAbroadIdeals = Array.isArray(settings?.abroadIdeals) ? settings.abroadIdeals : [];
                const sanitizedIsraelIdeals = Array.isArray(settings?.israelIdeals) ? settings.israelIdeals : [];

                return (
                  <>
                    <div>
                      <label className="block text-zinc-500 text-xs font-black uppercase tracking-widest mb-4">חלוקה אידיאלית (ישראל vs חו"ל)</label>
                      <div className="bg-zinc-800/30 p-6 rounded-[2rem] border border-zinc-800/50">
                        <div className="flex items-center gap-4 mb-4">
                          <input 
                            type="range" 
                            min="0" max="100" 
                            value={100 - (localIdealIsrael ?? settings.idealIsraelPercent)} 
                            onChange={(e) => setLocalIdealIsrael(100 - Number(e.target.value))}
                            onMouseUp={() => localIdealIsrael !== null && handleUpdateIdealIsrael(localIdealIsrael)}
                            onTouchEnd={() => localIdealIsrael !== null && handleUpdateIdealIsrael(localIdealIsrael)}
                            className="flex-1 accent-[#D4AF37]"
                          />
                          <div className="relative">
                            <input 
                              type="number"
                              min="0" max="100"
                              value={100 - (localIdealIsrael ?? settings.idealIsraelPercent)}
                              onChange={(e) => {
                                const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                setLocalIdealIsrael(100 - val);
                              }}
                              onBlur={() => localIdealIsrael !== null && handleUpdateIdealIsrael(localIdealIsrael)}
                              className="bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl w-20 text-center text-white font-bold focus:border-[#D4AF37] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 font-bold">%</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] font-black tracking-tighter">
                          <div className="text-emerald-400">חו"ל ({100 - (localIdealIsrael ?? settings.idealIsraelPercent)}%)</div>
                          <div className="text-blue-400">ישראל ({localIdealIsrael ?? settings.idealIsraelPercent}%)</div>
                        </div>
                      </div>
                    </div>

                    {abroadInvestments.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                          <label className="block text-zinc-500 text-xs font-black uppercase tracking-widest">יעדים לנכסי חו"ל (מתוך סך חו"ל)</label>
                          <span className={`text-[10px] font-black ${isAbroadValid ? 'text-emerald-500' : 'text-red-500'}`}>
                            סה"כ: {abroadSum}%
                          </span>
                        </div>
                        <div className="grid gap-3">
                          {abroadInvestments.map(inv => {
                            const idealValue = localAbroadIdeals[inv.name] ?? (sanitizedAbroadIdeals.find(i => i.name === inv.name)?.percent || 0);
                            return (
                              <div key={inv._id} className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800/50">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-zinc-300 font-bold text-sm">{inv.name}</span>
                                  <div className="relative">
                                    <input 
                                      type="number"
                                      min="0" max="100"
                                      value={idealValue}
                                      onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                        setLocalAbroadIdeals(prev => ({ ...prev, [inv.name]: val }));
                                      }}
                                      onBlur={() => localAbroadIdeals[inv.name] !== undefined && handleUpdateAbroadIdeal(inv.name, localAbroadIdeals[inv.name])}
                                      className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg w-16 text-center text-[#D4AF37] font-black text-xs focus:border-[#D4AF37] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600 font-bold">%</span>
                                  </div>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" max="100" 
                                  value={idealValue} 
                                  onChange={(e) => setLocalAbroadIdeals(prev => ({ ...prev, [inv.name]: Number(e.target.value) }))}
                                  onMouseUp={() => localAbroadIdeals[inv.name] !== undefined && handleUpdateAbroadIdeal(inv.name, localAbroadIdeals[inv.name])}
                                  onTouchEnd={() => localAbroadIdeals[inv.name] !== undefined && handleUpdateAbroadIdeal(inv.name, localAbroadIdeals[inv.name])}
                                  className="w-full accent-[#D4AF37]"
                                />
                              </div>
                            );
                          })}
                          {!isAbroadValid && (
                            <button 
                              onClick={() => {
                                const even = Math.floor(100 / abroadInvestments.length);
                                const updates: Record<string, number> = {};
                                abroadInvestments.forEach((inv, idx) => {
                                  updates[inv.name] = idx === 0 ? 100 - (even * (abroadInvestments.length - 1)) : even;
                                });
                                setLocalAbroadIdeals(updates);
                                // Trigger update for all
                                Object.entries(updates).forEach(([name, val]) => handleUpdateAbroadIdeal(name, val));
                              }}
                              className="text-[10px] text-[#D4AF37] font-bold hover:underline text-right px-2"
                            >
                              חלק שווה בשווה ל-100%
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {israelInvestments.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                          <label className="block text-zinc-500 text-xs font-black uppercase tracking-widest">יעדים לנכסי ישראל (מתוך סך ישראל)</label>
                          <span className={`text-[10px] font-black ${isIsraelValid ? 'text-emerald-500' : 'text-red-500'}`}>
                            סה"כ: {israelSum}%
                          </span>
                        </div>
                        <div className="grid gap-3">
                          {israelInvestments.map(inv => {
                            const idealValue = localIsraelIdeals[inv.name] ?? (sanitizedIsraelIdeals.find(i => i.name === inv.name)?.percent || 0);
                            return (
                              <div key={inv._id} className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800/50">
                                <div className="flex justify-between items-center mb-3">
                                  <span className="text-zinc-300 font-bold text-sm">{inv.name}</span>
                                  <div className="relative">
                                    <input 
                                      type="number"
                                      min="0" max="100"
                                      value={idealValue}
                                      onChange={(e) => {
                                        const val = Math.min(100, Math.max(0, Number(e.target.value)));
                                        setLocalIsraelIdeals(prev => ({ ...prev, [inv.name]: val }));
                                      }}
                                      onBlur={() => localIsraelIdeals[inv.name] !== undefined && handleUpdateIsraelIdeal(inv.name, localIsraelIdeals[inv.name])}
                                      className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-lg w-16 text-center text-[#D4AF37] font-black text-xs focus:border-[#D4AF37] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600 font-bold">%</span>
                                  </div>
                                </div>
                                <input 
                                  type="range" 
                                  min="0" max="100" 
                                  value={idealValue} 
                                  onChange={(e) => setLocalIsraelIdeals(prev => ({ ...prev, [inv.name]: Number(e.target.value) }))}
                                  onMouseUp={() => localIsraelIdeals[inv.name] !== undefined && handleUpdateIsraelIdeal(inv.name, localIsraelIdeals[inv.name])}
                                  onTouchEnd={() => localIsraelIdeals[inv.name] !== undefined && handleUpdateIsraelIdeal(inv.name, localIsraelIdeals[inv.name])}
                                  className="w-full accent-[#D4AF37]"
                                />
                              </div>
                            );
                          })}
                          {!isIsraelValid && (
                            <button 
                              onClick={() => {
                                const even = Math.floor(100 / israelInvestments.length);
                                const updates: Record<string, number> = {};
                                israelInvestments.forEach((inv, idx) => {
                                  updates[inv.name] = idx === 0 ? 100 - (even * (israelInvestments.length - 1)) : even;
                                });
                                setLocalIsraelIdeals(updates);
                                // Trigger update for all
                                Object.entries(updates).forEach(([name, val]) => handleUpdateIsraelIdeal(name, val));
                              }}
                              className="text-[10px] text-[#D4AF37] font-bold hover:underline text-right px-2"
                            >
                              חלק שווה בשווה ל-100%
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="p-6 bg-zinc-900/80 backdrop-blur-md border-t border-zinc-800 mt-auto">
                      {!isValid && (
                        <p className="text-center text-red-500 text-[10px] font-bold mb-4 animate-pulse">
                          שימו לב: סך האחוזים חייב להיות בדיוק 100% כדי לשמור
                        </p>
                      )}
                      <button 
                        onClick={() => isValid && setShowStrategyModal(false)}
                        disabled={!isValid}
                        className={`w-full font-black py-4 rounded-2xl transition-all shadow-lg ${
                          isValid 
                            ? 'bg-[#D4AF37] text-black hover:bg-[#B8962F] shadow-[#D4AF37]/20' 
                            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        סגור ושמור
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
