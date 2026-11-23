"use client";

import { useActionState, useState } from "react";

import { BellPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";

import { saveSearch, type SaveSearchState } from "../actions";

export function SaveSearchButton({ filters, defaultName }: { filters: Record<string, string>; defaultName: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: SaveSearchState, formData: FormData) => {
    const result = await saveSearch(prev, formData);
    if (result?.ok) {
      toast.success(result.message);
      setOpen(false);
    }
    return result;
  }, undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <BellPlus /> Save this search
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader className="mb-3">
          <PopoverTitle>Save this search</PopoverTitle>
          <PopoverDescription>The bell will tell you when new matching offers arrive.</PopoverDescription>
        </PopoverHeader>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="filters" value={JSON.stringify(filters)} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="search-name">Name</Label>
            <Input id="search-name" name="name" defaultValue={defaultName} maxLength={60} />
          </div>
          {state?.message && !state.ok && <FieldError>{state.message}</FieldError>}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save search"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
