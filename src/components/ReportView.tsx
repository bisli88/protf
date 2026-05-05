import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  FileText, Copy, Check, Settings2, ChevronDown, ChevronUp,
  Plus, Trash2, Save, Eye, EyeOff, ArrowUpDown, SlidersHorizontal,
  X, BookMarked, Pencil, ChevronRight, Sparkles,
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
  netProfit: 'רווח נטו / הפסד סה"כ',
  taxPaid: "מס לתשלום",
};

const SORT_OPTIONS: { value: SortByType; label: string }[] = [
  { value: "value", label: "לפי שווי" },
  { value: "change", label: "לפי % שינוי" },
  { value: "name", label: "לפי שם" },
  { value: "addOrder", label: "סדר הוספה" },
];

const SCOPE_OPTIONS: { value: ScopeType; label: string; desc: string }[] = [
  { value: "all", label: "כל התיק", desc: "אחוזים ביחס לתיק המלא" },
  { value: "report", label: 'נכסי הדו"ח', desc: "אחוזים ביחס לנכסים בדו״ח בלבד" },
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

  const included = investments.filter(inv =>
    includedIds === null || includedIds.has(inv._id)
  );

  const reportTotalVal = included.reduce((s, inv) => s + toVal(inv, exchangeRate, displayCurrency), 0);
  const allTotalVal = investments.reduce((s, inv) => s + toVal(inv, exchangeRate, displayCurrency), 0);

  const catTotalMap: Record<string, number> = {};
  investments.forEach(inv => {
    catTotalMap[inv.category] = (catTotalMap[inv.category] || 0) + toVal(inv, exchangeRate, displayCurrency);
  });

  const summaryAssets = scope === "report" ? included : investments;

  const withInit = summaryAssets.filter(i => i.initialAmount && i.initialAmount > 0);
  const totalCurrent = withInit.reduce((s, i) => s + toVal(i, exchangeRate, displayCurrency), 0);
  const totalInitial = withInit.reduce((s, i) => s + (initialToVal(i, exchangeRate, displayCurrency) || 0), 0);
  const totalDiff = totalCurrent - totalInitial;
  const totalPct = totalInitial > 0 ? (totalDiff / totalInitial) * 100 : null;

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

  lines.push("══════════════════════════════════════");
  lines.push('       דו"ח תיק השקעות');
  lines.push(`       ${fmtDate(now)}`);
  lines.push("══════════════════════════════════════");
  lines.push("");

  lines.push('📋 אודות הדו"ח');
  lines.push("──────────────────────────────────────");
  lines.push('דו"ח זה מרכז את נתוני תיק ההשקעות שלך,');
  lines.push("כולל שווי נוכחי, רווחים, מיסים ואחוזי חלוקה.");
  lines.push(`הנתונים מוצגים ביחס ל: ${SCOPE_OPTIONS.find(s => s.value === scope)?.label}.`);
  lines.push(`ערכים מוצגים ב: ${displayCurrency === "ILS" ? "שקלים (ILS)" : "דולרים (USD)"}`);
  lines.push(`שער חליפין בשימוש: 1 USD = ₪${exchangeRate.toFixed(2)}`);
  lines.push("");

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

    const catWithInit = catInvestments.filter(i => i.initialAmount && i.initialAmount > 0);
    const catCurrent = catWithInit.reduce((s, i) => s + toVal(i, exchangeRate, displayCurrency), 0);
    const catInitial = catWithInit.reduce((s, i) => s + (initialToVal(i, exchangeRate, displayCurrency) || 0), 0);
    const catDiff = catCurrent - catInitial;
    const catChangePct = catInitial > 0 ? (catDiff / catInitial) * 100 : null;
    const catGross = catDiff;

    const catGains = catWithInit.reduce((s, i) => {
      const d = toVal(i, exchangeRate, displayCurrency) - (initialToVal(i, exchangeRate, displayCurrency) || 0);
      return d > 0 ? s + d : s;
    }, 0);
    const catLosses = catWithInit.reduce((s, i) => {
      const d = toVal(i, exchangeRate, displayCurrency) - (initialToVal(i, exchangeRate, displayCurrency) || 0);
      return d < 0 ? s + Math.abs(d) : s;
    }, 0);
    const catTax = Math.max(0, catGains * TAX_RATE - catLosses);
    const catNet = catGross - catTax;

    lines.push(`┌─ ${catName.toUpperCase()} ─────────────────────`);
    lines.push(`│  שווי קטגוריה:  ${sym}${fmt(catCurrentVal)}  (${catPct.toFixed(1)}% מהתיק)`);
    if (catChangePct !== null) {
      const s = catDiff >= 0 ? "▲" : "▼";
      lines.push(`│  תשואה:         ${s} ${Math.abs(catChangePct).toFixed(2)}%  (${catDiff >= 0 ? "+" : ""}${sym}${fmt(Math.abs(catDiff))})`);
    }
    lines.push("│");

    const sorted = [...catInvestments].sort((a, b) => {
      if (sortBy === "value") return toVal(b, exchangeRate, displayCurrency) - toVal(a, exchangeRate, displayCurrency);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "change") {
        const pctA = a.initialAmount ? ((toVal(a, exchangeRate, displayCurrency) - (initialToVal(a, exchangeRate, displayCurrency) || 0)) / (initialToVal(a, exchangeRate, displayCurrency) || 1)) * 100 : -Infinity;
        const pctB = b.initialAmount ? ((toVal(b, exchangeRate, displayCurrency) - (initialToVal(b, exchangeRate, displayCurrency) || 0)) / (initialToVal(b, exchangeRate, displayCurrency) || 1)) * 100 : -Infinity;
        return pctB - pctA;
      }
      return 0;
    });

    for (const inv of sorted) {
      const currentVal = toVal(inv, exchangeRate, displayCurrency);
      const initVal = initialToVal(inv, exchangeRate, displayCurrency);
      const diff = initVal !== null ? currentVal - initVal : null;
      const changePct = diff !== null && initVal ? (diff / initVal) * 100 : null;
      const grossProfit = diff;
      const tax = grossProfit !== null && grossProfit > 0 ? grossProfit * TAX_RATE : 0;
      const netProfit = grossProfit !== null ? grossProfit - tax : null;

      const scopeBaseInv = scope === "all" ? allTotalVal : scope === "report" ? reportTotalVal : catTotalMap[catName] || 1;
      const portPct = (currentVal / scopeBaseInv) * 100;
      const catInvPct = (currentVal / (catTotalMap[catName] || 1)) * 100;

      const ticker = inv.ticker ? ` [${inv.ticker}]` : "";
      lines.push(`│  ▸ ${inv.name}${ticker}`);

      if (fields.currentValue) lines.push(`│    שווי נוכחי:         ${sym}${fmt(currentVal)}`);
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
          lines.push(`│    סה"כ הפסד:           -${sym}${fmt(Math.abs(grossProfit))}`);
        }
      }
      if (fields.portfolioPercent) lines.push(`│    אחוז ${scope === "report" ? 'מהדו"ח' : "מהתיק"}:        ${portPct.toFixed(1)}%`);
      if (fields.categoryPercent) lines.push(`│    אחוז מהקטגוריה:     ${catInvPct.toFixed(1)}%`);
      lines.push("│");
    }

    if (catWithInit.length > 0) {
      if (catGross >= 0) {
        if (catTax > 0) {
          lines.push(`└─ סיכום ${catName}: רווח ברוטו +${sym}${fmt(catGross)}  |  מס: ${sym}${fmt(catTax)}  |  נטו: +${sym}${fmt(catNet)}`);
        } else if (catLosses > 0) {
          lines.push(`└─ סיכום ${catName}: רווח ברוטו +${sym}${fmt(catGross)}  |  מס: ${sym}0 (קוזז ע"י הפסדים)  |  נטו: +${sym}${fmt(catNet)}`);
        } else {
          lines.push(`└─ סיכום ${catName}: רווח ברוטו +${sym}${fmt(catGross)}  |  מס: ${sym}${fmt(catTax)}  |  נטו: +${sym}${fmt(catNet)}`);
        }
      } else {
        lines.push(`└─ סיכום ${catName}: סה"כ הפסד -${sym}${fmt(Math.abs(catGross))}`);
      }
    } else {
      lines.push(`└─ סיכום ${catName}: ${sym}${fmt(catCurrentVal)}`);
    }
    lines.push("");
  }

  lines.push("══════════════════════════════════════");
  lines.push("* המס מחושב על פי שיעור של 25% (ללא התחשבות בשערי המרה היסטוריים).");
  lines.push('* הדו"ח מיועד למטרות מעקב אישי בלבד.');
  lines.push("══════════════════════════════════════");

  return lines.join("\n");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GradientPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/5 shadow-2xl ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(30,30,35,0.95) 0%, rgba(20,20,25,0.98) 100%)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Subtle gold top-edge glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)" }}
      />
      {children}
    </div>
  );
}

function ControlChip({
  active,
  onClick,
  icon: Icon,
  label,
  activeColor = "gold",
}: {
  active?: boolean;
  onClick: () => void;
  icon?: React.ElementType;
  label: string;
  activeColor?: "gold" | "green";
}) {
  const activeStyles =
    activeColor === "green"
      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
      : "border-[#D4AF37]/40 text-[#D4AF37]";
  const activeBg =
    activeColor === "green"
      ? ""
      : "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))";

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold tracking-wide transition-all duration-200 ${
        active
          ? `${activeStyles} shadow-sm`
          : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
      }`}
      style={active && activeColor === "gold" ? { background: activeBg } : {}}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {label}
    </button>
  );
}

function SelectControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-white/10 text-zinc-300 text-[11px] font-semibold outline-none transition-colors duration-200 hover:border-white/20 cursor-pointer"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
        }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} style={{ background: "#1a1a1f" }}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={11}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportView({ investments, categories, exchangeRate }: ReportViewProps) {
  const profiles = useQuery(api.investments.getReportProfiles) ?? [];
  const saveProfile = useMutation(api.investments.saveReportProfile);
  const deleteProfile = useMutation(api.investments.deleteReportProfile);

  const [activeProfileId, setActiveProfileId] = useState<Id<"reportProfiles"> | null>(null);
  const [profileName, setProfileName] = useState('דו"ח חדש');
  const [hideExcluded, setHideExcluded] = useState(true);
  const [includedIds, setIncludedIds] = useState<Set<string> | null>(null);
  const [scope, setScope] = useState<ScopeType>("all");
  const [sortBy, setSortBy] = useState<SortByType>("value");
  const [fields, setFields] = useState<ReportFields>(DEFAULT_FIELDS);
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyType>("ILS");

  const [activePanel, setActivePanel] = useState<"fields" | "assets" | "profiles" | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  const togglePanel = (panel: "fields" | "assets" | "profiles") =>
    setActivePanel(prev => (prev === panel ? null : panel));

  const visibleInvestments = useMemo(
    () => (hideExcluded ? investments.filter(i => !i.excludeFromCalculator) : investments),
    [investments, hideExcluded]
  );

  const effectiveIncluded = useMemo(() => {
    if (includedIds === null) return new Set(visibleInvestments.map(i => i._id as string));
    return new Set([...includedIds].filter(id => visibleInvestments.some(i => i._id === id)));
  }, [includedIds, visibleInvestments]);

  const reportText = useMemo(
    () =>
      buildReportText(
        visibleInvestments,
        categories,
        exchangeRate,
        fields,
        scope,
        sortBy,
        includedIds,
        displayCurrency
      ),
    [visibleInvestments, categories, exchangeRate, fields, scope, sortBy, includedIds, displayCurrency]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      toast.success('הדו"ח הועתק ללוח!');
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
    setDisplayCurrency(p.displayCurrency || "ILS");
    setIncludedIds(p.includedInvestmentIds ? new Set(p.includedInvestmentIds) : null);
    setActivePanel(null);
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = visibleInvestments.every(i => effectiveIncluded.has(i._id as string));

  const activeFieldCount = Object.values(fields).filter(Boolean).length;

  return (
    <div dir="rtl" className="space-y-3 pb-8" style={{ fontFamily: "'Rubik', sans-serif" }}>

      {/* ── Header Card */}
      <GradientPanel>
        <div className="p-5">
          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.1))",
                  border: "1px solid rgba(212,175,55,0.3)",
                  boxShadow: "0 0 20px rgba(212,175,55,0.1)",
                }}
              >
                <FileText size={18} className="text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">דו״ח תיק</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {effectiveIncluded.size} מתוך {visibleInvestments.length} נכסים נבחרו
                </p>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: copied
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "linear-gradient(135deg, #D4AF37, #B8962F)",
                color: "#000",
                boxShadow: copied
                  ? "0 4px 20px rgba(34,197,94,0.3)"
                  : "0 4px 20px rgba(212,175,55,0.25)",
              }}
            >
              {copied ? <Check size={14} strokeWidth={3} /> : <Copy size={14} />}
              {copied ? "הועתק!" : "העתק דו״ח"}
            </button>
          </div>

          {/* Controls row 1 — main settings */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <SelectControl
              value={sortBy}
              onChange={v => setSortBy(v as SortByType)}
              options={SORT_OPTIONS}
            />
            <SelectControl
              value={scope}
              onChange={v => setScope(v as ScopeType)}
              options={SCOPE_OPTIONS}
            />
            <ControlChip
              active={displayCurrency === "USD"}
              onClick={() => setDisplayCurrency(v => (v === "ILS" ? "USD" : "ILS"))}
              icon={ArrowUpDown}
              label={displayCurrency === "ILS" ? "₪ שקלים" : "$ דולרים"}
              activeColor="green"
            />
            <ControlChip
              active={!hideExcluded}
              onClick={() => setHideExcluded(v => !v)}
              icon={hideExcluded ? EyeOff : Eye}
              label={hideExcluded ? "מוחרגים מוסתרים" : "מוחרגים מוצגים"}
            />
          </div>

          {/* Controls row 2 — panels */}
          <div className="flex flex-wrap items-center gap-2">
            <ControlChip
              active={activePanel === "fields"}
              onClick={() => togglePanel("fields")}
              icon={SlidersHorizontal}
              label={`שדות (${activeFieldCount})`}
            />
            <ControlChip
              active={activePanel === "assets"}
              onClick={() => togglePanel("assets")}
              icon={Check}
              label="נכסים בדו״ח"
            />
            <ControlChip
              active={activePanel === "profiles"}
              onClick={() => togglePanel("profiles")}
              icon={BookMarked}
              label={profiles.length > 0 ? `פרופילים (${profiles.length})` : "פרופילים"}
            />
            <ControlChip
              active={showSaveDialog}
              onClick={() => setShowSaveDialog(v => !v)}
              icon={Save}
              label="שמור פרופיל"
            />
          </div>
        </div>
      </GradientPanel>

      {/* ── Save Dialog */}
      {showSaveDialog && (
        <GradientPanel>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">שמירת פרופיל דו״ח</h4>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={profileName}
              onChange={e => setProfileName(e.target.value)}
              placeholder='למשל: "דו"ח לרואה חשבון"'
              className="w-full px-4 py-3 rounded-xl text-white text-sm font-medium outline-none mb-3 transition-colors"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(212,175,55,0.3)",
              }}
              onFocus={e => (e.target.style.borderColor = "rgba(212,175,55,0.6)")}
              onBlur={e => (e.target.style.borderColor = "rgba(212,175,55,0.3)")}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                className="flex-1 py-2.5 rounded-xl font-semibold text-sm text-black transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #D4AF37, #B8962F)" }}
              >
                שמור
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2.5 rounded-xl text-zinc-400 text-sm transition-colors hover:text-zinc-200"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                ביטול
              </button>
            </div>
          </div>
        </GradientPanel>
      )}

      {/* ── Profiles Panel */}
      {activePanel === "profiles" && (
        <GradientPanel>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-white">פרופילים שמורים</h4>
              <button onClick={() => setActivePanel(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                <X size={16} />
              </button>
            </div>

            {profiles.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.15)" }}>
                  <BookMarked size={18} className="text-[#D4AF37]/50" />
                </div>
                <p className="text-zinc-600 text-xs">אין פרופילים שמורים עדיין</p>
                <p className="text-zinc-700 text-[10px] mt-1">שמור הגדרות דו״ח לשימוש עתידי</p>
              </div>
            ) : (
              <div className="space-y-2">
                {profiles.map(p => (
                  <div
                    key={p._id}
                    className="group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all duration-200"
                    style={{
                      background: activeProfileId === p._id
                        ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${activeProfileId === p._id ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.06)"}`,
                    }}
                    onClick={() => loadProfile(p as ReportProfile)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${activeProfileId === p._id ? "text-[#D4AF37]" : "text-zinc-200"}`}>
                        {p.name}
                      </p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {SCOPE_OPTIONS.find(s => s.value === p.scope)?.label} · {SORT_OPTIONS.find(s => s.value === p.sortBy)?.label} · {p.displayCurrency === "USD" ? "$" : "₪"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => { loadProfile(p as ReportProfile); setShowSaveDialog(true); }}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-[#D4AF37] transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteProfile(p._id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GradientPanel>
      )}

      {/* ── Field Settings Panel */}
      {activePanel === "fields" && (
        <GradientPanel>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-white">שדות בדו״ח</h4>
                <p className="text-[10px] text-zinc-600 mt-0.5">{activeFieldCount} מתוך {Object.keys(DEFAULT_FIELDS).length} פעילים</p>
              </div>
              <button onClick={() => setActivePanel(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DEFAULT_FIELDS) as (keyof ReportFields)[]).map(key => (
                <button
                  key={key}
                  onClick={() => toggleField(key)}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-xl border text-right transition-all duration-200"
                  style={{
                    background: fields[key]
                      ? "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(212,175,55,0.05))"
                      : "rgba(255,255,255,0.025)",
                    border: `1px solid ${fields[key] ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <div
                    className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all duration-200"
                    style={{
                      background: fields[key] ? "linear-gradient(135deg, #D4AF37, #B8962F)" : "transparent",
                      border: `1.5px solid ${fields[key] ? "#D4AF37" : "rgba(255,255,255,0.15)"}`,
                    }}
                  >
                    {fields[key] && <Check size={9} className="text-black" strokeWidth={3} />}
                  </div>
                  <span className={`text-[11px] font-medium ${fields[key] ? "text-zinc-200" : "text-zinc-500"}`}>
                    {FIELD_LABELS[key]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </GradientPanel>
      )}

      {/* ── Asset Picker Panel */}
      {activePanel === "assets" && (
        <GradientPanel>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-semibold text-white">נכסים בדו״ח</h4>
                <p className="text-[10px] text-zinc-600 mt-0.5">{effectiveIncluded.size} נבחרו</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIncludedIds(allSelected ? new Set() : null)}
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: "#D4AF37" }}
                >
                  {allSelected ? "בטל הכל" : "בחר הכל"}
                </button>
                <button onClick={() => setActivePanel(null)} className="text-zinc-600 hover:text-zinc-300 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {categories.map(cat => {
                const catInvs = visibleInvestments.filter(i => i.category === cat.name);
                if (catInvs.length === 0) return null;
                return (
                  <div key={cat._id}>
                    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2 px-1">
                      {cat.name}
                    </p>
                    <div className="space-y-1.5">
                      {catInvs.map(inv => {
                        const checked = effectiveIncluded.has(inv._id as string);
                        return (
                          <button
                            key={inv._id}
                            onClick={() => toggleAsset(inv._id as string)}
                            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-right transition-all duration-200"
                            style={{
                              background: checked ? "rgba(212,175,55,0.07)" : "rgba(255,255,255,0.02)",
                              border: `1px solid ${checked ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)"}`,
                              opacity: checked ? 1 : 0.5,
                            }}
                          >
                            <div
                              className="w-4 h-4 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                background: checked ? "linear-gradient(135deg, #D4AF37, #B8962F)" : "transparent",
                                border: `1.5px solid ${checked ? "#D4AF37" : "rgba(255,255,255,0.2)"}`,
                              }}
                            >
                              {checked && <Check size={9} className="text-black" strokeWidth={3} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${checked ? "text-white" : "text-zinc-400"}`}>
                                {inv.name}
                                {inv.ticker && (
                                  <span className="text-[10px] text-zinc-600 mr-1.5">[{inv.ticker}]</span>
                                )}
                              </p>
                            </div>
                            <p className="text-[11px] font-semibold text-zinc-400 flex-shrink-0 tabular-nums">
                              {displayCurrency === "ILS" ? "₪" : "$"}
                              {fmt(toVal(inv, exchangeRate, displayCurrency))}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </GradientPanel>
      )}

      {/* ── Report Preview */}
      <GradientPanel>
        {/* Preview header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#D4AF37", boxShadow: "0 0 6px rgba(212,175,55,0.6)" }} />
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              תצוגה מקדימה
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[11px] font-medium transition-all duration-200"
            style={{ color: copied ? "#22c55e" : "#71717a" }}
            onMouseEnter={e => !copied && ((e.currentTarget as HTMLElement).style.color = "#D4AF37")}
            onMouseLeave={e => !copied && ((e.currentTarget as HTMLElement).style.color = "#71717a")}
          >
            {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} />}
            {copied ? "הועתק" : "העתק"}
          </button>
        </div>

        {/* Report text */}
        <div className="p-5 overflow-x-auto">
          <pre
            dir="rtl"
            className="text-[11.5px] leading-[1.8] text-zinc-300 whitespace-pre-wrap break-words"
            style={{
              fontFamily: "'Courier New', Courier, monospace",
              textShadow: "0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {reportText}
          </pre>
        </div>
      </GradientPanel>

      <div className="h-4" />
    </div>
  );
}