import { useRoute, Link, useLocation } from "wouter";
import { useEquipment, useDeleteEquipment } from "@/hooks/use-equipment";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { generateProPDF } from "@/lib/pdfGenerator"; // ✅ Step 1 ki file se link
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RepairTable } from "@/components/RepairTable";
import { Loader2, Edit, Trash2, FileText, Printer, MapPin, Tag, Activity, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function EquipmentDetail() {
  const [, params] = useRoute("/equipment/:id");
  const id = params?.id ? parseInt(params.id) : null;
  const [, setLocation] = useLocation();

  const { data: equipment, isLoading } = useEquipment(id);
  const deleteMutation = useDeleteEquipment();

  const handleDelete = async () => {
    if (id) {
      await deleteMutation.mutateAsync(id);
      setLocation("/inventory");
    }
  };

  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="w-10 animate-spin text-primary" /></div>;
  if (!equipment) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <PageHeader 
          title={equipment.equipmentName} 
          description={`${equipment.modelNumber} — ${equipment.serialNumber}`}
          backUrl="/inventory"
          actions={
            <div className="flex gap-2">
              {/* ✅ STEP 2 FIXED: Ab ye seedha generateProPDF ko call karega jisme Logo aur saari details hain */}
              
<Button 
  variant="outline" 
  onClick={() => generateProPDF(equipment)} 
  className="gap-2 border-black-200 text-black-700 hover:bg-red-50"
>
  <FileText className="w-4 h-4" /> Download History Sheet (Pro)
</Button>

              <Link href={`/equipment/${id}/edit`}>
                <Button variant="outline" className="gap-2"><Edit className="w-4 h-4" /> Edit</Button>
              </Link>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete the record.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="shadow-md border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" /> Repair History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RepairTable repairs={equipment.repairs} readOnly={true} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="shadow-md border-border/50 bg-white/80">
              <CardHeader><CardTitle className="text-lg">Equipment Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Location</p>
                      <p className="font-medium text-slate-900">{equipment.officeName}</p>
                      <p className="text-sm text-muted-foreground">{equipment.area} - {equipment.pincode}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Tag className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Division</p>
                      <p className="font-medium text-slate-900">{equipment.division}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Usage / Refill</p>
                      <p className="font-medium text-slate-900">{equipment.monthlyUsage || "N/A"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Dates</p>
                      <p className="text-xs text-slate-600">Mfg: {equipment.manufacturingDate || "N/A"}</p>
                      <p className="text-xs text-slate-600">Inst: {equipment.installationDate || "N/A"}</p>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Installed At (Branch)</p>
                    <p className="text-sm font-medium text-slate-900">{equipment.installedAt || "N/A"}</p>
                  </div>
                  {equipment.remarks && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Remarks</p>
                        <p className="text-sm italic text-slate-600">{equipment.remarks}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/10 shadow-inner">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Repairs</p>
                  <p className="text-2xl font-bold text-primary">{equipment.repairs.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    ₹{equipment.repairs.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}