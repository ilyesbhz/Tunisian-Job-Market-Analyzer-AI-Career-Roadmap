"use client";

import { useActionState } from "react";

import { Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { LOCAL_COUNTRY } from "@/lib/config";
import { CAREER_STATUSES, type CareerStatus } from "@/lib/roadmap/schema";

import { createRoadmap } from "../actions";

export type RoadmapDefaults = {
  status: CareerStatus | null;
  targetRole: string | null;
  country: string | null;
  skills: string[];
};

export function RoadmapForm({ countries, defaults }: { countries: string[]; defaults: RoadmapDefaults }) {
  const [state, action, pending] = useActionState(createRoadmap, undefined);
  const err = state?.errors;

  return (
    <form action={action} className="flex flex-col gap-5">
      <FieldGroup className="gap-5">
        <FieldSet className="gap-0" data-invalid={!!err?.status}>
          <FieldLegend variant="label">Where are you now?</FieldLegend>
          <div className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(CAREER_STATUSES) as CareerStatus[]).map((key, i) => (
              <label
                key={key}
                className="hover:bg-muted/50 has-checked:border-primary has-checked:bg-primary/5 has-focus-visible:ring-ring/50 flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 has-focus-visible:ring-3"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <input type="radio" name="status" value={key} defaultChecked={defaults.status ? defaults.status === key : i === 0} className="accent-primary" />
                  {CAREER_STATUSES[key].label}
                </span>
                <span className="text-muted-foreground pl-5 text-xs">{CAREER_STATUSES[key].hint}</span>
              </label>
            ))}
          </div>
          <FieldError>{err?.status?.[0]}</FieldError>
        </FieldSet>

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field className="gap-1.5" data-invalid={!!err?.targetRole}>
            <FieldLabel htmlFor="targetRole">Target role</FieldLabel>
            <Input
              id="targetRole"
              name="targetRole"
              defaultValue={defaults.targetRole ?? ""}
              placeholder="e.g. Data analyst, Web developer, Accountant"
              aria-invalid={!!err?.targetRole}
              required
            />
            <FieldError>{err?.targetRole?.[0]}</FieldError>
          </Field>
          <Field className="gap-1.5" data-invalid={!!err?.country}>
            <FieldLabel htmlFor="country">Country</FieldLabel>
            <NativeSelect id="country" name="country" defaultValue={defaults.country ?? LOCAL_COUNTRY}>
              {countries.map((c) => (
                <NativeSelectOption key={c} value={c}>
                  {c}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError>{err?.country?.[0]}</FieldError>
          </Field>
        </div>

        <Field className="gap-1.5" data-invalid={!!err?.skills}>
          <FieldLabel htmlFor="skills">Your current skills</FieldLabel>
          <Textarea
            id="skills"
            name="skills"
            rows={2}
            defaultValue={defaults.skills.join(", ")}
            placeholder="e.g. Python, SQL, Excel, English"
          />
          <FieldDescription>Separate them with commas. They are compared with what offers ask for.</FieldDescription>
          <FieldError>{err?.skills?.[0]}</FieldError>
        </Field>

        <Field className="gap-1.5" data-invalid={!!err?.goal}>
          <FieldLabel htmlFor="goal">Anything else? (optional)</FieldLabel>
          <Textarea
            id="goal"
            name="goal"
            rows={2}
            placeholder="e.g. I want to work remotely for a European company within two years"
          />
          <FieldError>{err?.goal?.[0]}</FieldError>
        </Field>
      </FieldGroup>

      {state?.message && <FieldError>{state.message}</FieldError>}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {pending ? "Building your roadmap…" : "Generate my roadmap"}
        </Button>
        {pending && (
          <span className="text-muted-foreground text-sm" aria-live="polite">
            Analysing matching offers, then writing your plan. This can take a minute.
          </span>
        )}
      </div>
    </form>
  );
}
