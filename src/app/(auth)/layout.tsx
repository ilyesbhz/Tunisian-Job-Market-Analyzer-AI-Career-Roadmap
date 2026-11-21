import type { ReactNode } from "react";

import { BarChart3 } from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/config/app-config";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main>
      <div className="grid h-dvh justify-center p-2 lg:grid-cols-2">
        <div className="bg-primary relative order-2 hidden h-full rounded-3xl lg:flex">
          <div className="text-primary-foreground absolute top-10 space-y-1 px-10">
            <BarChart3 className="size-10" />
            <h1 className="text-2xl font-medium">{APP_CONFIG.name}</h1>
            <p className="text-sm">Tunisian job market intelligence.</p>
          </div>

          <div className="absolute bottom-10 flex w-full justify-between px-10">
            <div className="text-primary-foreground flex-1 space-y-1">
              <h2 className="font-medium">Explore opportunities</h2>
              <p className="text-sm">Browse job offers across sectors and cities, in Tunisia and abroad.</p>
            </div>
            <Separator orientation="vertical" className="mx-3 h-auto!" />
            <div className="text-primary-foreground flex-1 space-y-1">
              <h2 className="font-medium">Compare salaries</h2>
              <p className="text-sm">Every salary is converted to TND per month using daily exchange rates.</p>
            </div>
          </div>
        </div>
        <div className="relative order-1 flex h-full">{children}</div>
      </div>
    </main>
  );
}
