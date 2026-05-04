import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  FileText, Copy, Check, Settings2, ChevronDown, ChevronUp,
  Plus, Trash2, Save, Eye, EyeOff, ArrowUpDown, SlidersHorizontal,
  X, BookMarked, Pencil,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Investment {
  _id: Id<"investments">;
  name: string;
  amount: number;
  initialAmount?: number;
  currency: "ILS" | "USD";
  category: string;
  excludeFromCalculator?: boolean;
  ticker?: string;
}

interface Category {
  _id: Id<"categories">;
  name: string;
}

interface ReportFields {
  currentValue: boolean;
  portfolioPercent: boolean;
  categoryPercent: boolean;
  changePercent: boolean;
  grossProfit: boolean;
  netProfit: boolean;
  taxPaid: boolean;
}

type ScopeType = "all" | "report" | "category";
type SortByType = "value" | "change" | "name" | "addOrder";
type CurrencyType = "ILS" | "USD";

interface ReportProfile {
  _id: Id<"reportProfiles">;
  name: string;
  includedInvestmentIds?: string[];
  hideExcluded: boolean;
  scope: ScopeType;
  sortBy: SortByType;
  fields: ReportFields;
  displayCurrency: CurrencyType;
}

interface ReportViewProps {
  investments: Investment[];
  categories: Category[];
  exchangeRate: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TAX_RATE = 0.25;

const DEFAULT_FIELDS: ReportFields = {
  currentValue: true,
  portfolioPercent: true,
  categoryPercent: true,
  changePercent: true,
  grossProfit: true,
  netProfit: true,
  taxPaid: true,
};

const FIELD_LABELS: Record<keyof ReportFields, string> = {
  currentValue: "שווי נוכחי",
  portfolioPercent: "אחוז מהתיק",
  categoryPercent: "אחוז מהקטגוריה",
  changePercent: "% שינוי",
  grossProfit: "רווח ברוטו",
  netProfit: "רווח נטו / הפסד סה\"כ",
  taxPaid: "מס לתשלום",
};

const SORT_OPTIONS: { value: SortByType; label: string }[] = [
  { value: "value", label: "לפי שווי" },
  { value: "change", label: "לפי % שינוי" },
  { value: "name", label: "לפי שם" },
  { value: "addOrder", label: "לפי סדר הוספה" },
];

const SCOPE_OPTIONS: { value: ScopeType; label: string; desc: string }[] = [
  { value: "all", label: "כל התיק", desc: "אחוזים ביחס לתיק המלא" },
  { value: "report", label: "נכסי הדו\"ח", desc: "אחוזים ביחס לנכסים בדו\"ח בלבד" },
  { value: "category", label: "קטגוריה", desc: "אחוזים ביחס לקטגוריה" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function convertCurrency(amount: number, from: CurrencyType, to: CurrencyType, rate: number) {
  if (from === to) return amount;
  if (from === "USD" && to === "ILS") return amount * rate;
  if (from === "ILS" && to === "USD") return amount / rate;
  return amount;
}

function toVal(inv: Investment, rate: number, target: CurrencyType) {
  return convertCurrency(inv.amount, inv.currency, target, rate);
}

function initialToVal(inv: Investment, rate: number, target: CurrencyType) {
  if (!inv.initialAmount) return null;
  return convertCurrency(inv.initialAmount, inv.currency, target, rate);
}

function fmt(n: number) {
  return n.toLocaleString("he-IL", { maximumFractionDigits: 0 });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("he-IL", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Report text builder ──────────────────────────────────────────────────────

function buildReportText(
  investments: Investment[],
  categories: Category[],
  exchangeRate: number,
  fields: ReportFields,
  scope: ScopeType,
  sortBy: SortByType,
  includedIds: Set<string> | null,
  displayCurrency: CurrencyType
) {
  const now = new Date();
  const lines: string[] = [];
  const sym = displayCurrency === "ILS" ? "₪" : "$";

  // Filter
  const included = investments.filter(inv =>
    includedIds === null || includedIds.has(inv._id)
  );

  // Totals
  const reportTotalVal = included.reduce((s, inv) => s + toVal(inv, exchangeRate, displayCurrency), 0);
  const allTotalVal = investments.reduce((s, inv) => s + toVal(inv, exchangeRate, displayCurrency), 0);

  // Build per-category total map
  const catTotalMap: Record<string, number> = {};
  investments.forEach(inv => {
    catTotalMap[inv.category] = (catTotalMap[inv.category] || 0) + toVal(inv, exchangeRate, displayCurrency);
  });

  // --- בחירת הנכסים לחישוב הסיכום הכללי לפי ה-scope ---
  const summaryAssets = scope === "report" ? included : investments;

  // Overall PnL (only assets with initialAmount)
  const withInit = summaryAssets.filter(i => i.initialAmount && i.initialAmount > 0);
  const totalCurrent = withInit.reduce((s, i) => s + toVal(i, exchangeRate, displayCurrency), 0);
  const totalInitial = withInit.reduce((s, i) => s + (initialToVal(i, exchangeRate, displayCurrency) || 0), 0);
  const totalDiff = totalCurrent - totalInitial;
  const totalPct = totalInitial > 0 ? (totalDiff / totalInitial) * 100 : null;

  // חישוב מס על בסיס המטבע הנבחר
  const totalGains = withInit.reduce((s, i) => {
    const d = toVal(i, exchangeRate, displayCurrency) - (initialToVal(i, exchangeRate, displayCurrency) || 0);
    return d > 0 ? s + d : s;
  }, 0);
  const totalLosses = withInit.reduce((s, i) => {
    const d = toVal(i, exchangeRate, displayCurrency) - (initialToVal(i, exchangeRate, displayCurrency) || 0);
    return d < 0 ? s + Math.abs(d) : s;
  }, 0);
  
  const totalTax = totalGains * TAX_RATE - totalLosses;
  const finalTax = Math.max(0, totalTax);
  const totalNetProfit = withInit.length > 0 ? totalDiff - finalTax : null;

  // ── Header
  lines.push("══════════════════════════════════════");
  lines.push("       דו\"ח תיק השקעות");
  lines.push(`       ${fmtDate(now)}`);
  lines.push("══════════════════════════════════════");
  lines.push("");

  // ── Description
  lines.push("📋 אודות הדו\"ח");
  lines.push("──────────────────────────────────────");
  lines.push("דו\"ח זה מרכז את נתוני תיק ההשקעות שלך,");
  lines.push("כולל שווי נוכחי, רווחים, מיסים ואחוזי חלוקה.");
  lines.push(`הנתונים מוצגים ביחס ל: ${SCOPE_OPTIONS.find(s => s.value === scope)?.label}.`);
  lines.push(`ערכים מוצגים ב: ${displayCurrency === "ILS" ? "שקלים (ILS)" : "דולרים (USD)"}`);
  lines.push(`שער חליפין בשימוש: 1 USD = ₪${exchangeRate.toFixed(2)}`);
  lines.push("");

  // ── Summary
  lines.push("📊 סיכום כללי");
  lines.push("──────────────────────────────────────");
  
  if (scope === "report") {
    lines.push(`שווי כולל (בדו"ח): ${sym}${fmt(reportTotalVal)}`);
  } else {
    lines.push(`שווי תיק כולל:     ${sym}${fmt(allTotalVal)}`);
    if (includedIds !== null) {
      lines.push(`שווי נכסי הדו"ח:  ${sym}${fmt(reportTotalVal)}`);
    }
  }

  if (totalPct !== null) {
    const sign = totalDiff >= 0 ? "▲" : "▼";
    lines.push(`תשואה כוללת:       ${sign} ${Math.abs(totalPct).toFixed(2)}%  (${totalDiff >= 0 ? "+" : ""}${sym}${fmt(Math.abs(totalDiff))})`);
  }
  if (totalNetProfit !== null) {
    if (finalTax > 0) {
      lines.push(`סה"כ מס לתשלום:   ${sym}${fmt(finalTax)}`);
      lines.push(`רווח נטו כולל:     ${totalNetProfit >= 0 ? "+" : ""}${sym}${fmt(totalNetProfit)}`);
    } else if (totalLosses > 0) {
      lines.push(`סה"כ מס לתשלום:   ${sym}0  (ההפסדים קיזזו את כל המס על הרווחים)`);
      lines.push(`סה"כ הפסד נטו:     -${sym}${fmt(totalLosses - totalGains)}`);
    }
  }
  lines.push("");

  // ── Per category
  const categoryOrder = categories.map(c => c.name);
  const usedCats = [...new Set(included.map(i => i.category))];
  const sortedCats = [
    ...categoryOrder.filter(c => usedCats.includes(c)),
    ...usedCats.filter(c => !categoryOrder.includes(c)),
  ];

  for (const catName of sortedCats) {
    const catInvestments = included.filter(i => i.category === catName);
    if (catInvestments.length === 0) continue;

    const catCurrentVal = catInvestments.reduce((s, i) => s + toVal(i, exchangeRate, displayCurrency), 0);
    const scopeBase = scope === "all" ? allTotalVal : scope === "report" ? reportTotalVal : catTotalMap[catName] || 1;
    const catPct = (catCurrentVal / (scope === "category" ? allTotalVal : scopeBase)) * 100;

    // Category PnL
    const catWithInit = catInvestments.filter(i => i.initialAmount && i.initialAmount > 0);
    const catCurrent = catWithInit.reduce((s, i) => s + toVal(i, exchangeRate, displayCurrency), 0);
    const catInitial = catWithInit.reduce((s, i) => s + (initialToVal(i, exchangeRate, displayCurrency) || 0), 0);
    const catDiff = catCurrent - catInitial;
    const catChangePct = catInitial > 0 ? (catDiff / catInitial) * 100 : null;
    const catGross = catDiff;
    const catTax = catGross > 0 ? catGross * TAX_RATE : 0;
    const catNet = catGross - catTax;

    lines.push(`┌─ ${catName.toUpperCase()} ─────────────────────`);
    lines.push(`│  שווי קטגוריה:  ${sym}${fmt(catCurrentVal)}  (${catPct.toFixed(1)}% מהתיק)`);
    if (catChangePct !== null) {
      const s = catDiff >= 0 ? "▲" : "▼";
      lines.push(`│  תשואה:         ${s} ${Math.abs(catChangePct).toFixed(2)}%  (${catDiff >= 0 ? "+" : ""}${sym}${fmt(Math.abs(catDiff))})`);
    }
    lines.push("│");

    // Sort investments
    const sorted = [...catInvestments].sort((a, b) => {
      if (sortBy === "value") return toVal(b, exchangeRate, displayCurrency) - toVal(a, exchangeRate, displayCurrency);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "change") {
        const pctA = a.initialAmount ? ((toVal(a, exchangeRate, displayCurrency) - (initialToVal(a, exchangeRate, displayCurrency) || 0)) / (initialToVal(a, exchangeRate, displayCurrency) || 1)) * 100 : -Infinity;
        const pctB = b.initialAmount ? ((toVal(b, exchangeRate, displayCurrency) - (initialToVal(b, exchangeRate, displayCurrency) || 0)) / (initialToVal(b, exchangeRate, displayCurrency) || 1)) * 100 : -Infinity;
        return pctB - pctA;
      }
      return 0; // addOrder - keep original
    });

    for (const inv of sorted) {
      const currentVal = toVal(inv, exchangeRate, displayCurrency);
      const initVal = initialToVal(inv, exchangeRate, displayCurrency);
      const diff = initVal !== null ? currentVal - initVal : null;
      const changePct = diff !== null && initVal ? (diff / initVal) * 100 : null;
      const grossProfit = diff;
      const tax = grossProfit !== null && grossProfit > 0 ? grossProfit * TAX_RATE : 0;
      const netProfit = grossProfit !== null ? grossProfit - tax : null;

      // Portfolio / category / report percent
      const scopeBaseInv = scope === "all" ? allTotalVal : scope === "report" ? reportTotalVal : catTotalMap[catName] || 1;
      const portPct = (currentVal / scopeBaseInv) * 100;
      const catInvPct = (currentVal / (catTotalMap[catName] || 1)) * 100;

      const ticker = inv.ticker ? ` [${inv.ticker}]` : "";
      lines.push(`│  ▸ ${inv.name}${ticker}`);

      if (fields.currentValue)      lines.push(`│    שווי נוכחי:         ${sym}${fmt(currentVal)}`);
      if (fields.changePercent && changePct !== null) {
        const s = diff! >= 0 ? "▲" : "▼";
        lines.push(`│    שינוי:               ${s} ${Math.abs(changePct).toFixed(2)}%`);
      }
      if (fields.grossProfit && grossProfit !== null) {
        if (grossProfit >= 0) {
          lines.push(`│    רווח ברוטו:          +${sym}${fmt(grossProfit)}`);
        } else {
          lines.push(`│    הפסד:                -${sym}${fmt(Math.abs(grossProfit))}`);
        }
      }
      if (fields.taxPaid && grossProfit !== null && grossProfit > 0) {
        lines.push(`│    מס (25%):            ${sym}${fmt(tax)}`);
      }
      if (fields.netProfit && netProfit !== null) {
        if (grossProfit !== null && grossProfit >= 0) {
          lines.push(`│    רווח נטו:            +${sym}${fmt(netProfit)}`);
        } else if (grossProfit !== null && grossProfit < 0) {
          // Loss: no tax, net = gross
          lines.push(`│    סה"כ הפסד:           -${sym}${fmt(Math.abs(grossProfit))}`);
        }
      }
      if (fields.portfolioPercent)  lines.push(`│    אחוז ${scope === "report" ? "מהדו\"ח" : "מהתיק"}:        ${portPct.toFixed(1)}%`);
      if (fields.categoryPercent)   lines.push(`│    אחוז מהקטגוריה:     ${catInvPct.toFixed(1)}%`);
      lines.push("│");
    }

    // Category summary
    if (catWithInit.length > 0) {
      if (catGross >= 0) {
        const taxLine = `  |  מס: ${sym}${fmt(catTax)}  |  נטו: +${sym}${fmt(catNet)}`;
        lines.push(`└─ סיכום ${catName}: רווח ברוטו +${sym}${fmt(catGross)}${taxLine}`);
      } else {
        lines.push(`└─ סיכום ${catName}: סה"כ הפסד -${sym}${fmt(Math.abs(catGross))}`);
      }
    } else {
      lines.push(`└─ סיכום ${catName}: ${sym}${fmt(catCurrentVal)}`);
    }
    lines.push("");
  }

  // ── Footer
  lines.push("══════════════════════════════════════");
  lines.push("* המס מחושב על פי שיעור של 25% (ללא התחשבות בשערי המרה היסטוריים).");
  lines.push("* הדו\"ח מיועד למטרות מעקב אישי בלבד.");
  lines.push("══════════════════════════════════════");

  return lines.join("\n");
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportView({ investments, categories, exchangeRate }: ReportViewProps) {
  const profiles = useQuery(api.investments.getReportProfiles) ?? [];
  const saveProfile = useMutation(api.investments.saveReportProfile);
  const deleteProfile = useMutation(api.investments.deleteReportProfile);

  // ── Local state
  const [activeProfileId, setActiveProfileId] = useState<Id<"reportProfiles"> | null>(null);
  const [profileName, setProfileName] = useState("דו\"ח חדש");

  // Inclusion
  const [hideExcluded, setHideExcluded] = useState(true);
  const [includedIds, setIncludedIds] = useState<Set<string> | null>(null); // null = all

  // Config
  const [scope, setScope] = useState<ScopeType>("all");
  const [sortBy, setSortBy] = useState<SortByType>("value");
  const [fields, setFields] = useState<ReportFields>(DEFAULT_FIELDS);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyType>("ILS");

  // UI panels
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Derived: which investments to show (respecting hideExcluded)
  const visibleInvestments = useMemo(() =>
    hideExcluded ? investments.filter(i => !i.excludeFromCalculator) : investments,
    [investments, hideExcluded]
  );

  // Actual included set
  const effectiveIncluded = useMemo(() => {
    if (includedIds === null) return new Set(visibleInvestments.map(i => i._id as string));
    return new Set([...includedIds].filter(id => visibleInvestments.some(i => i._id === id)));
  }, [includedIds, visibleInvestments]);

  // ── Report text
  const reportText = useMemo(() => buildReportText(
    visibleInvestments,
    categories,
    exchangeRate,
    fields,
    scope,
    sortBy,
    includedIds, // pass null for "all"
    displayCurrency
  ), [visibleInvestments, categories, exchangeRate, fields, scope, sortBy, includedIds, displayCurrency]);

  // ── Handlers
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast.success("הדו\"ח הועתק ללוח!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("העתקה נכשלה");
    }
  }, [reportText]);

  const loadProfile = (p: ReportProfile) => {
    setActiveProfileId(p._id);
    setProfileName(p.name);
    setHideExcluded(p.hideExcluded);
    setScope(p.scope);
    setSortBy(p.sortBy);
    setFields(p.fields);
    setDisplayCurrency(p.displayCurrency || "ILS"); // Fallback for old profiles
    setIncludedIds(p.includedInvestmentIds ? new Set(p.includedInvestmentIds) : null);
    setShowProfilePanel(false);
    toast.success(`פרופיל "${p.name}" נטען`);
  };

  const handleSaveProfile = async () => {
    try {
      await saveProfile({
        id: activeProfileId ?? undefined,
        name: profileName,
        hideExcluded,
        scope,
        sortBy,
        fields,
        displayCurrency,
        includedInvestmentIds: includedIds ? [...includedIds] : undefined,
      });
      toast.success(`פרופיל "${profileName}" נשמר`);
      setShowSaveDialog(false);
    } catch {
      toast.error("שמירה נכשלה");
    }
  };

  const handleDeleteProfile = async (id: Id<"reportProfiles">) => {
    if (!confirm("למחוק פרופיל זה?")) return;
    try {
      await deleteProfile({ id });
      if (activeProfileId === id) setActiveProfileId(null);
      toast.success("פרופיל נמחק");
    } catch {
      toast.error("מחיקה נכשלה");
    }
  };

  const toggleField = (key: keyof ReportFields) =>
    setFields(prev => ({ ...prev, [key]: !prev[key] }));

  const toggleAsset = (id: string) => {
    setIncludedIds(prev => {
      const base = prev ?? new Set(visibleInvestments.map(i => i._id as string));
      const next = new Set(base);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allSelected = visibleInvestments.every(i => effectiveIncluded.has(i._id as string));

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Top action bar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#D4AF37]/10 p-2 rounded-xl">
              <FileText size={20} className="text-[#D4AF37]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">דו"ח תיק</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                {effectiveIncluded.size} / {visibleInvestments.length} נכסים
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Profiles */}
            <button
              onClick={() => setShowProfilePanel(v => !v)}
              className={`p-2.5 rounded-xl border transition-all ${showProfilePanel ? "bg-[#D4AF37]/10 border-[#D4AF37]/50 text-[#D4AF37]" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}
            >
              <BookMarked size={18} />
            </button>
            {/* Field settings */}
            <button
              onClick={() => setShowFieldSettings(v => !v)}
              className={`p-2.5 rounded-xl border transition-all ${showFieldSettings ? "bg-[#D4AF37]/10 border-[#D4AF37]/50 text-[#D4AF37]" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}
            >
              <SlidersHorizontal size={18} />
            </button>
            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-2.5 rounded-xl font-black text-sm hover:bg-[#B8962F] transition-all active:scale-95"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "הועתק!" : "העתק"}
            </button>
          </div>
        </div>

        {/* Quick controls row */}
        <div className="flex flex-wrap gap-2">
          {/* Hide excluded toggle */}
          <button
            onClick={() => setHideExcluded(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-black transition-all ${hideExcluded ? "bg-zinc-700 border-zinc-600 text-zinc-300" : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}
          >
            {hideExcluded ? <EyeOff size={13} /> : <Eye size={13} />}
            {hideExcluded ? "מוחרגים מוסתרים" : "הצג מוחרגים"}
          </button>

          {/* Asset picker */}
          <button
            onClick={() => setShowAssetPicker(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-black transition-all ${showAssetPicker ? "bg-[#D4AF37]/10 border-[#D4AF37]/40 text-[#D4AF37]" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
          >
            <Check size={13} />
            בחר נכסים
          </button>

          {/* Currency toggle */}
          <button
            onClick={() => setDisplayCurrency(v => v === "ILS" ? "USD" : "ILS")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-black transition-all ${displayCurrency === "USD" ? "bg-emerald-900/30 border-emerald-500/50 text-emerald-400" : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-zinc-200"}`}
          >
            <ArrowUpDown size={13} />
            {displayCurrency === "ILS" ? "₪ שקלים" : "$ דולרים"}
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortByType)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-black px-3 py-1.5 rounded-lg outline-none"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Scope */}
          <select
            value={scope}
            onChange={e => setScope(e.target.value as ScopeType)}
            className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[11px] font-black px-3 py-1.5 rounded-lg outline-none"
          >
            {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Save profile */}
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 text-[11px] font-black hover:text-zinc-200 transition-all"
          >
            <Save size={13} />
            שמור פרופיל
          </button>
        </div>
      </div>

      {/* ── Profile panel */}
      {showProfilePanel && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 shadow-xl space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white">פרופילי דו"ח שמורים</h4>
            <button onClick={() => setShowProfilePanel(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>

          {profiles.length === 0 && (
            <p className="text-zinc-600 text-xs text-center py-4">אין פרופילים שמורים עדיין</p>
          )}

          {profiles.map(p => (
            <div
              key={p._id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${activeProfileId === p._id ? "bg-[#D4AF37]/10 border-[#D4AF37]/40" : "bg-zinc-800/40 border-zinc-800 hover:border-zinc-600"}`}
              onClick={() => loadProfile(p as ReportProfile)}
            >
              <div>
                <p className={`text-sm font-black ${activeProfileId === p._id ? "text-[#D4AF37]" : "text-white"}`}>{p.name}</p>
                <p className="text-[10px] text-zinc-500 font-bold">
                  {SCOPE_OPTIONS.find(s => s.value === p.scope)?.label} · {SORT_OPTIONS.find(s => s.value === p.sortBy)?.label} · {p.displayCurrency === "USD" ? "דולרים" : "שקלים"}
                </p>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => { loadProfile(p as ReportProfile); setShowSaveDialog(true); }}
                  className="p-1.5 text-zinc-500 hover:text-[#D4AF37] transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDeleteProfile(p._id)}
                  className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Save dialog */}
      {showSaveDialog && (
        <div className="bg-zinc-900 border border-[#D4AF37]/30 rounded-[2rem] p-5 shadow-xl space-y-3 animate-in slide-in-from-top duration-200">
          <h4 className="text-sm font-black text-white">שמירת פרופיל דו"ח</h4>
          <input
            type="text"
            value={profileName}
            onChange={e => setProfileName(e.target.value)}
            placeholder='למשל: "דו"ח לרואה חשבון"'
            className="w-full bg-zinc-800 border border-zinc-700 px-4 py-3 rounded-xl text-white font-bold text-sm outline-none focus:border-[#D4AF37]"
          />
          <div className="flex gap-2">
            <button onClick={handleSaveProfile} className="flex-1 bg-[#D4AF37] text-black py-2.5 rounded-xl font-black text-sm">שמור</button>
            <button onClick={() => setShowSaveDialog(false)} className="px-4 bg-zinc-700 text-white py-2.5 rounded-xl font-black"><X size={18} /></button>
          </div>
        </div>
      )}

      {/* ── Field settings panel */}
      {showFieldSettings && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 shadow-xl space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white">שדות בדו"ח</h4>
            <button onClick={() => setShowFieldSettings(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(DEFAULT_FIELDS) as (keyof ReportFields)[]).map(key => (
              <button
                key={key}
                onClick={() => toggleField(key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[11px] font-black text-right transition-all ${fields[key] ? "bg-[#D4AF37]/10 border-[#D4AF37]/50 text-[#D4AF37]" : "bg-zinc-800/50 border-zinc-700 text-zinc-500"}`}
              >
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${fields[key] ? "bg-[#D4AF37] border-[#D4AF37]" : "border-zinc-600"}`}>
                  {fields[key] && <Check size={10} className="text-black" />}
                </div>
                {FIELD_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Asset picker */}
      {showAssetPicker && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 shadow-xl space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-white">בחר נכסים לדו"ח</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIncludedIds(allSelected ? new Set() : null)}
                className="text-[10px] font-black text-[#D4AF37] hover:underline"
              >
                {allSelected ? "בטל הכל" : "בחר הכל"}
              </button>
              <button onClick={() => setShowAssetPicker(false)} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
            </div>
          </div>

          {/* Group by category */}
          {categories.map(cat => {
            const catInvs = visibleInvestments.filter(i => i.category === cat.name);
            if (catInvs.length === 0) return null;
            return (
              <div key={cat._id} className="space-y-1.5">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">{cat.name}</p>
                {catInvs.map(inv => {
                  const checked = effectiveIncluded.has(inv._id as string);
                  return (
                    <button
                      key={inv._id}
                      onClick={() => toggleAsset(inv._id as string)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-right transition-all ${checked ? "bg-[#D4AF37]/10 border-[#D4AF37]/30" : "bg-zinc-800/30 border-zinc-800 opacity-50"}`}
                    >
                      <div className={`w-4 h-4 rounded-md border flex-shrink-0 flex items-center justify-center ${checked ? "bg-[#D4AF37] border-[#D4AF37]" : "border-zinc-600"}`}>
                        {checked && <Check size={10} className="text-black" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${checked ? "text-white" : "text-zinc-500"}`}>
                          {inv.name} {inv.ticker ? <span className="text-[10px] text-zinc-500">[{inv.ticker}]</span> : ""}
                        </p>
                      </div>
                      <p className="text-[11px] font-black text-zinc-400 flex-shrink-0">
                        {displayCurrency === "ILS" ? "₪" : "$"}{fmt(toVal(inv, exchangeRate, displayCurrency))}
                      </p>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Preview */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">תצוגה מקדימה</p>
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-[11px] font-black transition-all ${copied ? "text-emerald-400" : "text-zinc-400 hover:text-[#D4AF37]"}`}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "הועתק" : "העתק"}
          </button>
        </div>
        <div className="p-5 overflow-x-auto">
          <pre
            dir="rtl"
            className="text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap break-words"
            style={{ fontFamily: "'Courier New', Courier, monospace" }}
          >
            {reportText}
          </pre>
        </div>
      </div>

      <div className="h-6" />
    </div>
  );
}