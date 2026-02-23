import InventoryList from "@/pages/InventoryList";
import { Switch, Route, useLocation } from "wouter";
import PublicReport from "@/pages/PublicReport"; // ✅ Ye line zaroori hai
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import EquipmentForm from "@/pages/EquipmentForm";
import EquipmentDetail from "@/pages/EquipmentDetail";
import QRManagement from "@/pages/QRManagement"; // ✅ Naya Page
import Sidebar from "@/components/layout/Sidebar"; // ✅ Naya Sidebar
import { LogOut, ShieldCheck, MapPin, Building2, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const registrationSchema = z.object({
  name: z.string().min(2, "Full Name is required"),
  officeName: z.string().min(2, "Office name is required"),
  officeId: z.string().length(8, "Invalid Path! Enter exactly 8 digits"),
  pincode: z.string().length(6, "Invalid Path! Enter exactly 6 digits"),
  employeeId: z.string().min(2, "Employee ID is required"),
});

type RegistrationData = z.infer<typeof registrationSchema>;

interface Employee {
  name: string;
  officeName: string;
  officeId: string;
  pincode: string;
  employeeId: string;
  identity: string;
}

function RegistrationForm({ onRegister }: { onRegister: (emp: Employee) => void }) {
  const { toast } = useToast();
  const form = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { name: "", officeName: "", officeId: "", pincode: "", employeeId: "" },
  });

  const onSubmit = async (data: RegistrationData) => {
    try {
      const uniqueIdentity = `${data.officeId}_${data.pincode}`;
      const res = await apiRequest("POST", "/api/employee/register", { ...data, identity: uniqueIdentity });
      const employee = await res.json();
      onRegister(employee);
      toast({ title: "Welcome", description: `Office Identity: ${uniqueIdentity}` });
    } catch (error) {
      toast({ title: "Error", description: "Registration failed.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f2f5] p-6 font-display">
      <Card className="max-w-md w-full shadow-2xl border-none rounded-[2.5rem] overflow-hidden bg-white">
        <div className="bg-[#D41217] p-10 text-center text-white">
          <div className="bg-white p-4 rounded-3xl inline-block mb-4 shadow-lg">
            <img src="/assets/india-post-logo.png" alt="DOP" className="h-14 w-auto" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter uppercase font-display">DOP Assets</h2>
          <p className="text-white/70 text-[10px] font-bold tracking-[0.3em] mt-2 uppercase">Official Asset Management</p>
        </div>
        <CardContent className="p-10 space-y-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField 
                control={form.control} 
                name="name" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase text-slate-500 ml-1">Full Name</FormLabel>
                    <FormControl>
                      <Input className="h-12 rounded-2xl bg-slate-50" placeholder="e.g. Shekh Aslam" {...field} />
                    </FormControl>
                    <FormMessage className="text-[9px] font-bold text-red-600" />
                  </FormItem>
                )} 
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField 
                  control={form.control} 
                  name="officeId" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase text-slate-500 ml-1">Office ID (8 Digits)</FormLabel>
                      <FormControl>
                        <Input className="h-12 rounded-2xl bg-slate-50" maxLength={8} placeholder="e.g. 31670001" {...field} />
                      </FormControl>
                      <FormMessage className="text-[9px] font-bold text-red-600" />
                    </FormItem>
                  )} 
                />
                <FormField 
                  control={form.control} 
                  name="pincode" 
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] font-black uppercase text-slate-500 ml-1">Pincode (6 Digits)</FormLabel>
                      <FormControl>
                        <Input className="h-12 rounded-2xl bg-slate-50" maxLength={6} placeholder="e.g. 282001" {...field} />
                      </FormControl>
                      <FormMessage className="text-[9px] font-bold text-red-600" />
                    </FormItem>
                  )} 
                />
              </div>
              <FormField 
                control={form.control} 
                name="employeeId" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase text-slate-500 ml-1">Employee ID</FormLabel>
                    <FormControl>
                      <Input className="h-12 rounded-2xl bg-slate-50" placeholder="e.g. DOP10292009" {...field} />
                    </FormControl>
                  </FormItem>
                )} 
              />
              <FormField 
                control={form.control} 
                name="officeName" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-black uppercase text-slate-500 ml-1">Office Name</FormLabel>
                    <FormControl>
                      <Input className="h-12 rounded-2xl bg-slate-50" placeholder="e.g. NSH Agra" {...field} />
                    </FormControl>
                  </FormItem>
                )} 
              />
              <Button type="submit" className="w-full h-14 bg-[#D41217] hover:bg-red-700 text-white font-black rounded-2xl text-base uppercase tracking-widest shadow-lg mt-2 font-display transition-all active:scale-95">
                Start Working
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <footer className="mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-widest italic">App developed by Shekh Aslam, RMS X DN Jhansi</footer>
    </div>
  );
}

function Router() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("active_employee");
    if (saved) setEmployee(JSON.parse(saved));
    setIsInitializing(false);
  }, []);

  const handleRegister = (emp: Employee) => {
    localStorage.setItem("active_employee", JSON.stringify(emp));
    setEmployee(emp);
    queryClient.clear();
  };

  const handleLogout = () => {
    localStorage.removeItem("active_employee");
    setEmployee(null);
    queryClient.clear();
  };

  if (isInitializing) return null;
  if (!employee) return <RegistrationForm onRegister={handleRegister} />;

  return (
    <div className="min-h-screen flex bg-white font-display">
      
      {/* 🛠️ STEP 1: Sidebar left side mein set kiya */}
      <Sidebar /> 

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b-2 border-slate-50 sticky top-0 z-50">
          <div className="container mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <img src="/assets/india-post-logo.png" alt="DOP" className="h-10 w-auto" />
              <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
              <h1 className="font-black text-2xl text-[#D41217] tracking-tighter uppercase hidden sm:block">DOP ASSETS</h1>
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 bg-slate-50 hover:bg-red-50 p-1.5 pr-4 rounded-2xl border-2 border-slate-100 transition-all group shadow-sm">
                    <Avatar className="h-10 w-10 border-2 border-white">
                      <AvatarFallback className="bg-[#D41217] text-white font-black text-xs uppercase">
                        {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2) || "SA"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left hidden md:block">
                      <p className="text-xs font-black text-slate-900 uppercase leading-none">{employee.name}</p>
                      <p className="text-[10px] text-red-600 font-bold uppercase mt-1 tracking-tighter">View Profile</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 bg-white rounded-[2rem] shadow-2xl p-6 border-slate-100" align="end">
                  <DropdownMenuLabel className="mb-4 p-0">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-black text-slate-900 uppercase">{employee.name}</p>
                      <div className="flex items-center gap-2 text-slate-400">
                        <UserCircle2 className="w-3.5 h-3.5" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">EMP ID: {employee.employeeId}</p>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-50 mb-4" />
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Office Location</p>
                      </div>
                      <p className="text-xs font-bold text-slate-700 uppercase leading-relaxed mb-2">{employee.officeName}</p>
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-slate-500">
                         <MapPin className="w-3.5 h-3.5 text-red-500" />
                         <p className="text-[11px] font-black uppercase tracking-tight font-display">Pincode: <span className="text-slate-900">{employee.pincode}</span></p>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-red-600" />
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">Verified Office ID</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-red-200 shadow-inner">
                        <p className="text-[14px] font-mono font-black text-red-700 tracking-widest break-all leading-tight text-center uppercase">
                          {String(employee.officeId)}_{String(employee.pincode)}
                        </p>
                      </div>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleLogout} variant="ghost" className="h-12 px-5 gap-2 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-100 hover:border-red-100 transition-all font-black uppercase text-[10px] rounded-2xl">
                <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50/20">
          <Switch>
  <Route path="/" component={Dashboard} />
  {/* ✅ Is line ko add karne se Inventory Records chalne lagega */}
    <Route path="/qr-management" component={QRManagement} /> 
            <Route path="/inventory" component={InventoryList} />
            <Route path="/create" component={EquipmentForm} />
            <Route path="/equipment/:id" component={EquipmentDetail} />
            <Route path="/equipment/:id/edit" component={EquipmentForm} />
<Route path="/publicreport" component={PublicReport} />
            <Route component={NotFound} />
          </Switch>
        </main>
        
        <footer className="py-4 text-center border-t bg-white text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          App developed by Shekh Aslam, RMS X DN Jhansi
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;