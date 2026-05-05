"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", flow);
          void signIn("password", formData)
            .then(() => {
              setSubmitting(false);
            })
            .catch((error) => {
              console.error("Sign-in error:", error);
              toast.error(error.message);
              setSubmitting(false);
            });
        }}
      >
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <input
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
            type="email"
            name="email"
            placeholder="name@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <input
            className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none"
            type="password"
            name="password"
            placeholder="••••••••"
            required
          />
        </div>

        <button
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          type="submit"
          disabled={submitting}
        >
          {flow === "signIn" ? "Sign In" : "Sign Up"}
        </button>
        
        <div className="text-center text-sm">
          {flow === "signIn" ? (
            <>
              <span>Don't have an account? </span>
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={() => setFlow("signUp")}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                className="text-blue-600 hover:underline font-medium"
                onClick={() => setFlow("signIn")}
              >
                Sign In
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
