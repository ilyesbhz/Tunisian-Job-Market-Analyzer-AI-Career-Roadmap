import { BriefcaseBusiness, LayoutDashboard, type LucideIcon, Route } from "lucide-react";

export type NavBadge = "new" | "updated" | "soon";

export interface NavSubItem {
  id: string;
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

interface NavItemBase {
  id: string;
  title: string;
  icon?: LucideIcon;
  badge?: NavBadge;
  disabled?: boolean;
  newTab?: boolean;
}

export interface NavMainLinkItem extends NavItemBase {
  url: string;
  subItems?: never;
}

export interface NavMainParentItem extends NavItemBase {
  subItems: NavSubItem[];
}

export type NavMainItem = NavMainLinkItem | NavMainParentItem;

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Platform",
    items: [
      { id: "overview", title: "Overview", url: "/dashboard", icon: LayoutDashboard },
      { id: "jobs", title: "Job offers", url: "/dashboard/jobs", icon: BriefcaseBusiness },
    ],
  },
  {
    id: 2,
    label: "Career",
    items: [{ id: "roadmap", title: "AI career roadmap", url: "/dashboard/roadmap", icon: Route, badge: "new" }],
  },
];
