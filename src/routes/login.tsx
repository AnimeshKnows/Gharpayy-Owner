import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { authConfig } from "@/lib/api";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Gharpayy Inventory OS" },
      {
        name: "description",
        content: "Sign in to manage Gharpayy room-level rental inventory.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const u = await login(email, password);

      if (u.role === "owner") {
        navigate({ to: "/owner/dashboard" });
      } else if (u.role === "sales") {
        navigate({
          to: "/sales/dashboard",
          search: { location: undefined, controlType: undefined },
        });
      } else {
        navigate({ to: "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-6 py-10">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden bg-gradient-to-br from-primary/20 via-background to-background p-10 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-semibold">
                G
              </div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Gharpayy
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight">
                Inventory OS
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
                Owner and sales workflows on one room-level inventory engine.
                Stay in control of blocks, visits, bookings, and room truth.
              </p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-5 backdrop-blur">
              <p className="text-sm font-medium text-foreground">
                Workspace endpoint
              </p>
              <p className="mt-1 break-all text-sm text-muted-foreground">
                {authConfig.apiUrl}
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 lg:hidden">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-semibold">
                  G
                </div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Gharpayy
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Inventory OS
                </h1>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                  Welcome back
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in to your workspace · {authConfig.apiUrl}
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    placeholder="owner@demo.test"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                    placeholder="Demo1234!"
                    required
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
              </form>

              {authConfig.usingMock && (
                <div className="mt-6 rounded-2xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold text-foreground">Demo accounts</p>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p>owner@demo.test / Demo1234!</p>
                    <p>sales@demo.test / Demo1234!</p>
                    <p>admin@demo.test / Demo1234!</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}