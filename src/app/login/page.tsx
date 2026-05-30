import Link from "next/link";
import { Compass } from "lucide-react";
import { hasGoogle } from "@/lib/env";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="hero-gradient min-h-screen">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <Compass className="size-6 text-primary" />
          <span className="font-serif text-xl font-semibold tracking-tight">Voyager</span>
        </Link>
      </header>
      <div className="container flex justify-center py-12">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-muted-foreground">
            Sign in to sync your travel log across devices. The planner works without an
            account too.
          </p>
          <div className="mt-6">
            <LoginForm googleEnabled={hasGoogle()} />
          </div>
        </div>
      </div>
    </main>
  );
}
