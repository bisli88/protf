import { LayoutDashboard, Briefcase, Settings, TrendingUp, FileText } from "lucide-react";

interface BottomNavProps {
  activeView: string;
  onViewChange: (view: "overview" | "list" | "extra" | "report" | "settings") => void;
}

export function BottomNav({ activeView, onViewChange }: BottomNavProps) {
  const navItems = [
    { id: "overview", label: "ראשי", icon: LayoutDashboard },
    { id: "list", label: "נכסים", icon: Briefcase },
    { id: "extra", label: "אסטרטגיה", icon: TrendingUp },
    { id: "report", label: "דו\"ח", icon: FileText },
    { id: "settings", label: "הגדרות", icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#0A0A0B]/80 backdrop-blur-xl border-t border-zinc-800 z-50 px-6 pb-8 pt-4">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className={`flex flex-col items-center gap-1 transition-all duration-300 ${
                isActive ? "text-[#D4AF37]" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <div className={`p-2 rounded-2xl transition-all duration-300 ${
                isActive ? "bg-[#D4AF37]/10" : ""
              }`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isActive ? "opacity-100" : "opacity-50"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
