import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: Email({
        async sendVerificationRequest({
          identifier,
          url,
          token,
          expires,
        }: {
          identifier: string;
          url: string;
          token: string;
          expires: Date;
        }) {
          const resendApiKey = process.env.RESEND_API_KEY;
          if (!resendApiKey) {
            throw new Error("Missing RESEND_API_KEY environment variable");
          }

          const from = process.env.AUTH_EMAIL_FROM ?? "Portfolio Tracker <onboarding@resend.dev>";

          const resetUrl = new URL(url);
          resetUrl.protocol = "https:";
          resetUrl.hostname = "protf-59t1eaf9c-bisli88s-projects.vercel.app";
          // Convex Auth's default URL includes `code` but not `email`.
          // Include the email so the client can complete reset-verification without extra typing.
          resetUrl.searchParams.set("email", identifier);

          const subject = "Reset your password";
          const text = [
            "We received a request to reset your password.",
            "",
            "Use this link to reset it:",
            resetUrl.toString(),
            "",
            `This link/code expires at: ${expires.toISOString()}`,
            "",
            `If you’re asked for a code, use: ${token}`,
          ].join("\n");

          const html = `
            <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
              <h2 style="margin: 0 0 12px;">Reset your password</h2>
              <p style="margin: 0 0 12px;">We received a request to reset your password.</p>
              <p style="margin: 0 0 12px;">
                <a href="${resetUrl.toString()}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;">
                  Reset password
                </a>
              </p>
              <p style="margin: 0 0 12px;">Or copy and paste this link:</p>
              <p style="margin: 0 0 12px;"><a href="${resetUrl.toString()}">${resetUrl.toString()}</a></p>
              <p style="margin: 0 0 12px; color:#6b7280;">Expires at: ${expires.toISOString()}</p>
              <p style="margin: 0; color:#6b7280;">If you’re asked for a code, use: <b>${token}</b></p>
            </div>
          `.trim();

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: identifier,
              subject,
              html,
              text,
            }),
          });

          if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Failed to send reset email: ${res.status} ${errText}`);
          }
        },
      }),
    }),
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get("users", userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
