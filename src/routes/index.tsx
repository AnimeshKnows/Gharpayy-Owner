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

    if (user.role === "owner") {
      navigate({ to: "/owner/dashboard" });
    } else if (user.role === "sales") {
      navigate({
        to: "/sales/dashboard",
        search: { location: undefined, controlType: undefined },
      });
    }
  }, [user, loading, navigate]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16">
        <div className="max-w-3xl">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">
            G
          </div>

          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Gharpayy
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Inventory OS
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Owners <strong>fill beds without losing control</strong>. Sales{" "}
            <strong>sell what&apos;s real, close faster</strong>.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Link
            to="/owner/dashboard"
            className="group rounded-3xl border border-border bg-surface p-6 transition hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
            </div>

            <h2 className="mt-5 text-xl font-semibold">Owner dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Properties, rooms, pending block requests, effort feed, and room-level control.
            </p>
          </Link>

          <Link
            to="/sales/dashboard"
            search={{ location: undefined, controlType: undefined }}
            className="group rounded-3xl border border-border bg-surface p-6 transition hover:border-primary/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Headphones className="h-6 w-6" />
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
            </div>

            <h2 className="mt-5 text-xl font-semibold">Sales dashboard</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Owner-confirmed inventory with priority stacking and live room-level selling context.
            </p>
          </Link>
        </div>

        {!user && !loading && (
          <p className="mt-8 text-sm text-muted-foreground">
            Not signed in.{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Go to login
            </Link>
            .
          </p>
        )}
      </section>
    </main>
  );
}