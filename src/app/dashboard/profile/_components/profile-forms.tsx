"use client";

import { useActionState } from "react";

import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { CAREER_STATUSES, type CareerStatus } from "@/lib/roadmap/schema";

import { changePassword, type ProfileFormState, updateAccount, updateCareerProfile } from "../actions";

function Result({ state }: { state: ProfileFormState }) {
  if (!state?.message) return null;
  return state.ok ? (
    <p role="status" className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
      <CheckCircle2 className="size-4" /> {state.message}
    </p>
  ) : (
    <FieldError>{state.message}</FieldError>
  );
}

function TextField({
  name,
  label,
  state,
  ...props
}: { name: string; label: string; state: ProfileFormState } & React.ComponentProps<typeof Input>) {
  const error = state?.errors?.[name]?.[0];
  return (
    <Field className="gap-1.5" data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input id={name} name={name} aria-invalid={!!error} {...props} />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

export function AccountForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateAccount, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <TextField name="name" label="Name" defaultValue={name} autoComplete="name" state={state} />
        <TextField name="email" label="Email" type="email" defaultValue={email} autoComplete="email" state={state} />
      </FieldGroup>
      <Result state={state} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    // key resets the fields after a successful change
    <form key={state?.ok ? "done" : "form"} action={action} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <TextField name="currentPassword" label="Current password" type="password" autoComplete="current-password" state={state} />
        <TextField name="newPassword" label="New password" type="password" autoComplete="new-password" state={state} />
        <TextField name="confirmPassword" label="Confirm new password" type="password" autoComplete="new-password" state={state} />
      </FieldGroup>
      <Result state={state} />
      <Button type="submit" variant="outline" disabled={pending} className="w-fit">
        {pending ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

export function CareerForm({
  countries,
  profile,
}: {
  countries: string[];
  profile: { careerStatus: CareerStatus | null; targetRole: string | null; preferredCountry: string | null; skills: string[] };
}) {
  const [state, action, pending] = useActionState(updateCareerProfile, undefined);
  const err = state?.errors;
  return (
    <form action={action} className="flex flex-col gap-4">
      <FieldGroup className="gap-4">
        <FieldSet className="gap-0">
          <FieldLegend variant="label">Where are you now?</FieldLegend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(CAREER_STATUSES) as CareerStatus[]).map((key) => (
              <label
                key={key}
                className="hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-ring/50 flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 has-focus-visible:ring-3"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="radio"
                    name="careerStatus"
                    value={key}
                    defaultChecked={profile.careerStatus === key}
                    className="accent-primary"
                  />
                  {CAREER_STATUSES[key].label}
                </span>
                <span className="text-muted-foreground pl-5 text-xs">{CAREER_STATUSES[key].hint}</span>
              </label>
            ))}
          </div>
        </FieldSet>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <TextField
            name="targetRole"
            label="Target role"
            placeholder="e.g. Data analyst"
            defaultValue={profile.targetRole ?? ""}
            state={state}
          />
          <Field className="gap-1.5">
            <FieldLabel htmlFor="preferredCountry">Preferred country</FieldLabel>
            <NativeSelect id="preferredCountry" name="preferredCountry" defaultValue={profile.preferredCountry ?? ""}>
              <NativeSelectOption value="">No preference</NativeSelectOption>
              {countries.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
        </div>
        <Field className="gap-1.5" data-invalid={!!err?.skills}>
          <FieldLabel htmlFor="skills">Skills</FieldLabel>
          <Textarea
            id="skills"
            name="skills"
            rows={2}
            defaultValue={profile.skills.join(", ")}
            placeholder="e.g. Python, SQL, Excel, English"
          />
          <FieldDescription>Separate them with commas.</FieldDescription>
          <FieldError>{err?.skills?.[0]}</FieldError>
        </Field>
      </FieldGroup>
      <Result state={state} />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save career profile"}
      </Button>
    </form>
  );
}
