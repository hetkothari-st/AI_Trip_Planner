"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogIn, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Header auth control: "Sign in" when anonymous, user + "Sign out" when logged in. */
export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
          <UserIcon className="size-3.5" />
          {session.user.name ?? session.user.email}
        </span>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button asChild variant="ghost" size="sm">
      <Link href="/login">
        <LogIn className="size-4" /> Sign in
      </Link>
    </Button>
  );
}
