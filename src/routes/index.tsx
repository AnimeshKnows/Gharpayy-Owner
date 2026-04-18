import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, Building2, Headphones } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gharpayy Inventory OS" },
      {
        name: "description",
        content:
          "Room-level rental inventory control for co-living and PG properties — owner and Gharpayy sales views on one backend.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    if (user.role === "owner") navigate({ to: "/owner/dashboard" });
    else if (user.role === "sales") navigate({ to: "/sales/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            G
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight">Gharpayy</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Inventory OS
            </p>
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          One backend, two lenses.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Owners <em>fill beds without losing control</em>. Sales{" "}
          <em>sell what&apos;s real, close faster</em>.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            to="/owner/dashboard"
            className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                <Building2 className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-sm font-semibold">Owner dashboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Properties, rooms, pending block requests, effort feed.
            </p>
          </Link>
          <Link
            to="/sales/dashboard"
            className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                <Headphones className="h-4 w-4" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-4 text-sm font-semibold">Sales dashboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Owner-confirmed inventory with priority stacking.
            </p>
          </Link>
        </div>

        {!user && !loading && (
          <p className="mt-8 text-xs text-muted-foreground">
            Not signed in.{" "}
            <Link to="/login" className="font-medium text-primary underline">
              Go to login
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
