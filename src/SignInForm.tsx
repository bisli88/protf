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
        className="flex flex-col gap-form-field"
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
              let toastTitle = "";
              if (error.message.includes("Invalid password")) {
                toastTitle = "סיסמה שגויה. אנא נסה שוב.";
              } else {
                toastTitle =
                  flow === "signIn"
                    ? `לא ניתן להתחבר: ${error.message}`
                    : `לא ניתן להירשם: ${error.message}`;
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
          placeholder="אימייל"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="סיסמה"
          required
        />

        <button className="auth-button" type="submit" disabled={submitting}>
          {flow === "signIn" ? "התחברות" : "הרשמה"}
        </button>
        <div className="text-center text-sm text-secondary">
          {flow === "signIn" ? (
            <>
              <span>אין לך חשבון? </span>
              <button
                type="button"
                className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
                onClick={() => setFlow("signUp")}
              >
                הירשם במקום
              </button>
            </>
          ) : (
            <>
              <span>כבר יש לך חשבון? </span>
              <button
                type="button"
                className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
                onClick={() => setFlow("signIn")}
              >
                התחבר במקום
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
