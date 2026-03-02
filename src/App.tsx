import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { PortfolioTracker } from "./components/PortfolioTracker";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50" dir="rtl">
      <main className="flex-1">
        <Authenticated>
          <PortfolioTracker />
        </Authenticated>
        
        <Unauthenticated>
          <div className="flex items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-sm">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 mb-2">
                  תיק השקעות
                </h2>
                <p className="text-gray-500 font-medium">
                  עקוב אחר ההשקעות שלך ב-₪ וב-$
                </p>
              </div>
              <SignInForm />
            </div>
          </div>
        </Unauthenticated>
      </main>
      
      <Toaster position="top-center" />
    </div>
  );
}
