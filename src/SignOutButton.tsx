import { useAuthActions } from "@convex-dev/auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const { signOut } = useAuthActions();

  return (
    <button
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
      onClick={() => void signOut()}
    >
      <LogOut size={16} />
      <span>Sign Out</span>
    </button>
  );
}
