"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp" | "reset" | "reset-verification">(
    "signIn"
  );
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlEmail = params.get("email");
    const urlCode = params.get("code") ?? params.get("token");
    if (urlEmail) {
      setEmail(urlEmail);
    }
    if (urlCode) {
      setCode(urlCode);
      setFlow("reset-verification");
      // Remove params from URL to clean up
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const isResetVerification = flow === "reset-verification";

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          if (code) {
            formData.set("code", code);
          }
          formData.set("flow", flow);
          void signIn("password", formData)
            .then(() => {
              if (flow === "reset") {
                toast.success("Check your email for a reset link.");
                setFlow("signIn");
              } else if (flow === "reset-verification") {
                toast.success("Password reset successfully. You are now signed in.");
              }
              setSubmitting(false);
            })
            .catch((error) => {
              console.error("Sign-in error:", error);
              let toastTitle = "";
              if (error.message.includes("Invalid password")) {
                toastTitle = "Invalid password. Please try again.";
              } else if (flow === "reset") {
                toastTitle = `Could not send reset email: ${error.message}`;
              } else if (flow === "reset-verification") {
                toastTitle = `Invalid or expired reset code: ${error.message}`;
              } else {
                toastTitle =
                  flow === "signIn"
                    ? `Could not sign in: ${error.message}`
                    : `Could not sign up: ${error.message}`;
              }
              toast.error(toastTitle);
              setSubmitting(false);
            });
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
          value={email}
          readOnly={isResetVerification && !!email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {flow !== "reset" && (
          <input
            className="auth-input-field"
            type="password"
            name={isResetVerification ? "newPassword" : "password"}
            placeholder={isResetVerification ? "New Password" : "Password"}
            required
          />
        )}

        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn"
            ? "Sign in"
            : flow === "signUp"
              ? "Sign up"
              : flow === "reset"
                ? "Send reset email"
                : "Reset password"}
        </button>
        <div className="text-center text-sm text-secondary">
          {flow === "signIn" ? (
            <>
              <div className="mb-2">
                <button
                  type="button"
                  className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
                  onClick={() => setFlow("reset")}
                >
                  Forgot password?
                </button>
              </div>
              <span>Don't have an account? </span>
              <button
                type="button"
                className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
                onClick={() => setFlow("signUp")}
              >
                Sign up instead
              </button>
            </>
          ) : flow === "signUp" ? (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
                onClick={() => setFlow("signIn")}
              >
                Sign in instead
              </button>
            </>
          ) : (
            <>
              <span>Remembered your password? </span>
              <button
                type="button"
                className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
                onClick={() => setFlow("signIn")}
              >
                Sign in instead
              </button>
            </>
          )}
        </div>
      </form>
      <div className="flex items-center justify-center my-3">
        <hr className="my-4 grow border-gray-200" />
        <span className="mx-4 text-secondary">or</span>
        <hr className="my-4 grow border-gray-200" />
      </div>
      <button className="auth-button" onClick={() => void signIn("anonymous")}>
        Sign in anonymously
      </button>
    </div>
  );
}
