import type { Metadata } from "next";
import { Suspense } from "react";

import { Wordmark } from "@/components/ui/Logo";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function AdminLoginPage() {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Wordmark className="mx-auto h-5 w-auto text-ink" />
          <p className="mt-2 text-label text-gold uppercase">Admin</p>
        </div>
        <div className="border border-mist bg-paper p-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
