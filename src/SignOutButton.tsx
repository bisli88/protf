import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-gray-500 border border-gray-200 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm active:scale-95"
      onClick={() => void signOut()}
    >
      <LogOut size={18} />
      <span>התנתק מהמערכת</span>
    </button>
  );
}
