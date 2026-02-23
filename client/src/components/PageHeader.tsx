import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  backUrl?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, backUrl, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          {backUrl && (
            <Link href={backUrl}>
              <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2 rounded-full hover:bg-slate-100">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-display">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
