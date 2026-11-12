"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup } from "../actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">Create an account</h1>
      <form action={action} className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">Name</label>
          <input id="name" name="name" className="mt-1 w-full rounded border p-2" />
          {state?.errors?.name && <p className="mt-1 text-sm text-red-600">{state.errors.name[0]}</p>}
        </div>
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
        <button disabled={pending} className="rounded bg-black p-2 text-white disabled:opacity-50 dark:bg-white dark:text-black">
          {pending ? "Creating..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </main>
  );
}