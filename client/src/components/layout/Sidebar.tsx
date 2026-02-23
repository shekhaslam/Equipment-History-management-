import { Link, useLocation } from "wouter";
import { QrCode, LayoutDashboard, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();

  const menuItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Inventory Records", href: "/inventory", icon: Package },
    { label: "QR Management", href: "/qr-management", icon: QrCode }
  ];

  return (
    <div className="w-64 min-h-screen bg-slate-900 text-white p-4 flex flex-col border-r border-slate-800 print:hidden">
      <div className="mb-8 px-2">
        <h2 className="text-[#D41217] font-black text-xl uppercase tracking-tighter">DEPARTMENT OF POSTS</h2>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ASSETS MANAGEMENT</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">INDIA POST © 2026</p>
      </div>

      <nav className="space-y-2 flex-1">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-sm transition-all",
              location === item.href ? "bg-[#D41217] text-white shadow-lg" : "text-slate-400 hover:bg-slate-800"
            )}>
              <item.icon className="w-5 h-5" />
              {item.label}
            </a>
          </Link>
        ))}
      </nav>
    </div>
  );
}