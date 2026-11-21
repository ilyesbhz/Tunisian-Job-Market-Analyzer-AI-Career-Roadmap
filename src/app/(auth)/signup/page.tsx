"use client";

import { useActionState } from "react";

import Link from "next/link";

import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { APP_CONFIG } from "@/config/app-config";

import { signup } from "../actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 px-6 sm:w-[350px] sm:px-0">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-medium">Create your account</h1>
          <p className="text-muted-foreground text-sm">Please enter your details to register.</p>
        </div>
        <form action={action} noValidate className="flex flex-col gap-4">
          <FieldGroup className="gap-4">
            <Field className="gap-1.5" data-invalid={!!state?.errors?.name}>
              <FieldLabel htmlFor="name">Name</FieldLabel>
              <Input id="name" name="name" placeholder="Your name" autoComplete="name" aria-invalid={!!state?.errors?.name} />
              <FieldError>{state?.errors?.name?.[0]}</FieldError>
            </Field>
            <Field className="gap-1.5" data-invalid={!!state?.errors?.email}>
              <FieldLabel htmlFor="email">Email Address</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={!!state?.errors?.email}
              />
              <FieldError>{state?.errors?.email?.[0]}</FieldError>
            </Field>
            <Field className="gap-1.5" data-invalid={!!state?.errors?.password}>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                aria-invalid={!!state?.errors?.password}
              />
              <FieldError>{state?.errors?.password?.[0]}</FieldError>
            </Field>
          </FieldGroup>
          <FieldError>{state?.message}</FieldError>
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Creating..." : "Register"}
          </Button>
        </form>
      </div>

      <div className="absolute top-5 flex w-full justify-end px-10">
        <div className="text-muted-foreground text-sm">
          Already have an account?{" "}
          <Link prefetch={false} className="text-foreground" href="/login">
            Login
          </Link>
        </div>
      </div>

      <div className="absolute bottom-5 flex w-full justify-between px-10">
        <div className="text-sm">{APP_CONFIG.copyright}</div>
        <div className="flex items-center gap-1 text-sm">
          <Globe className="text-muted-foreground size-4" />
          ENG
        </div>
      </div>
    </>
  );
}
