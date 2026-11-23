"use client";

import { useOptimistic, useTransition } from "react";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { toggleFavorite } from "../actions";

export function SaveJobButton({ jobId, title, saved }: { jobId: number; title: string; saved: boolean }) {
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(saved);
  const [, startTransition] = useTransition();

  const onClick = () =>
    startTransition(async () => {
      setOptimisticSaved(!optimisticSaved);
      try {
        const nowSaved = await toggleFavorite(jobId);
        toast(nowSaved ? "Offer saved" : "Removed from saved offers", { description: title });
      } catch {
        toast.error("Could not update your saved offers. Try again.");
      }
    });

  const label = optimisticSaved ? "Remove from saved offers" : "Save this offer";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onClick}
          aria-label={`${label}: ${title}`}
          aria-pressed={optimisticSaved}
          className={optimisticSaved ? "text-primary" : "text-muted-foreground"}
        >
          {optimisticSaved ? <BookmarkCheck className="fill-current" /> : <Bookmark />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
