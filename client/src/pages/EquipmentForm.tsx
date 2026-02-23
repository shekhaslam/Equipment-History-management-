import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { insertEquipmentSchema } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useEquipment, useCreateEquipment, useUpdateEquipment } from "@/hooks/use-equipment";
import { PageHeader } from "@/components/PageHeader";
import { RepairTable } from "@/components/RepairTable";
import { generateProPDF } from "@/lib/pdfGenerator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, FileText, Settings, RefreshCw } from "lucide-react";

const formSchema = insertEquipmentSchema.extend({ 
  repairs: z.array(z.any()).optional(),
  status: z.string().default("ACTIVE") 
});
type FormData = z.infer<typeof formSchema>;

export default function EquipmentForm() {
  const [match, params] = useRoute("/equipment/:id/edit");
  const isEditMode = !!match;
  const id = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: equipment, isLoading: isLoadingData } = useEquipment(id);
  const createMutation = useCreateEquipment();
  const updateMutation = useUpdateEquipment();
  const [repairs, setRepairs] = useState<any[]>([]);

  const form = useForm<FormData>({
    defaultValues: {
      officeName: "", division: "", area: "", pincode: "",
      equipmentName: "", modelNumber: "", serialNumber: "",
      monthlyUsage: "", installedAt: "",
      manufacturingDate: "", installationDate: "", remarks: "",
      status: "ACTIVE",
    },
  });

  useEffect(() => {
    if (equipment) {
      form.reset({
        ...equipment,
        installedAt: equipment.installLocation || equipment.installedAt || "", 
        monthlyUsage: equipment.usage || equipment.monthlyUsage || "",
        status: equipment.status || "ACTIVE"
      });
      setRepairs(equipment.repairs || []);
    }
  }, [equipment, form]);

  const handlePreviewPDF = () => {
    const formData = form.getValues();
    const fullData = { 
      ...formData, 
      repairs: repairs.filter(r => r.date || r.natureOfRepair) 
    };
    generateProPDF(fullData, true); 
  };

  const onSubmit = async (data: FormData) => {
    try {
      const payload = { ...data, repairs: repairs.filter(r => r.date || r.natureOfRepair) };
      if (isEditMode && id) {
        await updateMutation.mutateAsync({ id: Number(id), data: payload as any });
        toast({ title: "Updated", description: "Equipment record updated successfully." });
        setLocation(`/equipment/${id}`);
      } else {
        const result = await createMutation.mutateAsync(payload as any);
        toast({ title: "Saved", description: "New equipment added successfully." });
        if (result?.id) setLocation(`/equipment/${result.id}`);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ✅ Step-by-Step Navigation Logic
  const handleCancel = () => {
    const targetPath = isEditMode ? `/equipment/${id}` : "/inventory";
    setLocation(targetPath);
  };

  if (isEditMode && isLoadingData) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 text-left">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* ✅ Updated Back Button Path */}
        <PageHeader 
          title={isEditMode ? "Edit Sheet" : "Create Sheet"} 
          backUrl={isEditMode ? `/equipment/${id}` : "/inventory"} 
        />
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="shadow-md border-border/60">
            <CardHeader className="pb-4 border-b bg-white/50">
              <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                <Settings className="w-5 h-5 text-primary" /> Equipment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 pt-6">
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Office Name</Label><Input {...form.register("officeName")} placeholder="e.g. Head Office" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Division</Label><Input {...form.register("division")} placeholder="e.g. IT Department" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Area / City</Label><Input {...form.register("area")} placeholder="e.g. Mumbai" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pincode</Label><Input type="text" {...form.register("pincode")} placeholder="e.g. 400001" className="bg-white focus-visible:ring-primary/20" /></div>

              <Separator className="md:col-span-2 my-2" />

              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Equipment Name</Label><Input {...form.register("equipmentName")} placeholder="e.g. Laser Printer" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Model Number</Label><Input {...form.register("modelNumber")} placeholder="e.g. HP-LJ-1020" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Serial Number</Label><Input {...form.register("serialNumber")} placeholder="e.g. CN12345678" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Manufacturing Date</Label><Input type="date" {...form.register("manufacturingDate")} className="bg-white" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Installed At (Branch Name)</Label><Input {...form.register("installedAt")} placeholder="e.g. Main Branch" className="bg-white focus-visible:ring-primary/20" /></div>
              <div className="space-y-1.5"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Installation Date</Label><Input type="date" {...form.register("installationDate")} className="bg-white" /></div>
              <div className="space-y-1.5 md:col-span-2"><Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly Usage Info</Label><Input {...form.register("monthlyUsage")} placeholder="e.g. 500 pages / monthly" className="bg-white focus-visible:ring-primary/20" /></div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${form.watch("status") === "CONDEMNED" ? "bg-red-500 animate-pulse" : "bg-green-500"}`}></div>
                  Current Operational Status
                </Label>
                <select 
                  {...form.register("status")}
                  className="flex h-11 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary/10 transition-all font-medium"
                >
                  <option value="ACTIVE">✅ ACTIVE (Working & Operational)</option>
                  <option value="CONDEMNED">❌ CONDEMNED (Not Fit for Use / Disposal)</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Remarks</Label>
                <Textarea {...form.register("remarks")} className="h-20 bg-white resize-none focus-visible:ring-primary/20" placeholder="Example: Equipment in good physical condition." />
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md border-border/60">
            <CardHeader className="pb-0 border-b bg-white/50">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground pb-4">Repair & Maintenance Record</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <RepairTable repairs={repairs} onChange={setRepairs} />
            </CardContent>
          </Card>
          
          <div className="flex items-center justify-between pt-6 border-t">
            <Button type="button" variant="outline" onClick={handlePreviewPDF} className="gap-2 border-primary/20 transition-all duration-200 hover:bg-primary hover:text-white h-11 px-6 font-medium">
              <FileText className="w-4 h-4" /> Live Preview
            </Button>
            
            <div className="flex gap-4">
              {/* ✅ Updated Cancel Logic */}
              <Button type="button" variant="ghost" onClick={handleCancel} className="h-11 font-medium">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="min-w-[160px] gap-2 bg-primary transition-all h-11 font-bold">
                { (createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : (isEditMode ? <RefreshCw className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
                {isEditMode ? "Update Record" : "Save Record"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}