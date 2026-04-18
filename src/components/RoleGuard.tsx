import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Role } from "@/types/models";
import { useAuth } from "@/lib/auth";

interface Props {
  allow: Role[];
  children: ReactNode;
}

export function RoleGuard({ allow, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Please sign in to access this page.
          </p>
          <Link
            to="/login"
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!allow.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your role ({user.role}) cannot view this page.
          </p>
          <Link
            to="/"
            className="mt-4 inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
          >
            Go home
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
