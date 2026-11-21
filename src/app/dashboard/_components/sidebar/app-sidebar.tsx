"use client";

import Link from "next/link";

import { BarChart3, Sparkles } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { APP_CONFIG } from "@/config/app-config";
import { sidebarItems } from "@/navigation/sidebar/sidebar-items";
import { usePreferencesStore } from "@/stores/preferences/preferences-provider";

import { NavMain } from "./nav-main";
import { NavUser, type SessionUser } from "./nav-user";

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: SessionUser }) {
  const { sidebarVariant, sidebarCollapsible, isSynced } = usePreferencesStore(
    useShallow((s) => ({
      sidebarVariant: s.values.sidebar_variant,
      sidebarCollapsible: s.values.sidebar_collapsible,
      isSynced: s.isSynced,
    })),
  );

  const variant = isSynced ? sidebarVariant : props.variant;
  const collapsible = isSynced ? sidebarCollapsible : props.collapsible;

  return (
    <Sidebar {...props} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link prefetch={false} href="/dashboard">
                <BarChart3 />
                <span className="text-base font-semibold">{APP_CONFIG.name}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <Card size="sm" className="overflow-hidden shadow-none group-data-[collapsible=icon]:hidden">
          <CardHeader className="min-w-0 px-4">
            <CardTitle className="flex items-center gap-2 truncate text-sm">
              <Sparkles className="size-4" />
              Explore the market
            </CardTitle>
            <CardDescription className="line-clamp-3">
              Compare local and international opportunities.{" "}
              <Link prefetch={false} href="/dashboard/jobs" className="text-foreground hover:underline">
                Browse offers
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
