"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input id="email" name="email" type="email" className="mt-1 w-full rounded border p-2" />
          {state?.errors?.email && <p className="mt-1 text-sm text-red-600">{state.errors.email[0]}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input id="password" name="password" type="password" className="mt-1 w-full rounded border p-2" />
          {state?.errors?.password && <p className="mt-1 text-sm text-red-600">{state.errors.password[0]}</p>}
        </div>
        {state?.message && <p className="text-sm text-red-600">{state.message}</p>}
        <button disabled={pending} className="rounded bg-black p-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {pending ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        No account yet? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </main>
  );
}