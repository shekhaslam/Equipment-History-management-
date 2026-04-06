import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCoveringLetterSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, Sparkles, Send, FileText, Trash2, History, Languages, Paperclip, X, Download, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateCoveringLetterPDF } from "@/lib/pdfGenerator";
import { useDebounce } from "@/hooks/use-debounce";

export default function CoveringLetter() {
  const { toast } = useToast();
  const [roughIdea, setRoughIdea] = useState("");
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  const [isDrafting, setIsDrafting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: letters = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ["/api/letters"],
  });

  const form = useForm({
    resolver: zodResolver(insertCoveringLetterSchema),
    defaultValues: {
      header: localStorage.getItem("letter_header") || "DEPARTMENT OF POSTS, INDIA\nOffice of the Manager Agra NSH, RMS X Division Agra-282001",
      letterNo: "",
      date: new Date().toISOString().split('T').sort().reverse().join('-'), // YYYY-MM-DD
      recipient: "",
      sender: localStorage.getItem("letter_sender_name") || "",
      designation: localStorage.getItem("letter_sender_designation") || "Manager\nNational Sorting Hub\nAgra-282001",
      subject: "",
      reference: "",
      body: "",
      language: "English",
      roughIdea: ""
    }
  });

  // Load latest employee name if sender is empty
  useEffect(() => {
    const savedEmp = localStorage.getItem("active_employee");
    if (savedEmp && !form.getValues("sender")) {
      form.setValue("sender", JSON.parse(savedEmp).name);
    }
  }, []);

  const formData = form.watch();
  const debouncedFormData = useDebounce(formData, 800);

  // Auto-save sticky fields
  useEffect(() => {
    localStorage.setItem("letter_header", formData.header || "");
    localStorage.setItem("letter_sender_name", formData.sender || "");
    localStorage.setItem("letter_sender_designation", formData.designation || "");
  }, [formData.header, formData.sender, formData.designation]);

  // Update Live Preview
  useEffect(() => {
    const updatePreview = async () => {
      const url = await generateCoveringLetterPDF(debouncedFormData, true);
      if (url) setPreviewUrl(url as string);
    };
    updatePreview();
  }, [debouncedFormData]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/letters", data);
      return res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
      toast({ 
        title: res.action === "created" ? "Letter Saved" : "Letter Updated", 
        description: `Letter No ${form.getValues("letterNo")} saved to history.` 
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/letters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
      toast({ title: "Deleted", description: "Letter removed from history." });
    }
  });

  const handleAIDraft = async () => {
    if (!roughIdea.trim()) {
      return toast({ title: "Drafting Error", description: "Kuch toh likhiye taaki AI samajh sake.", variant: "destructive" });
    }

    setIsDrafting(true);
    try {
      const res = await apiRequest("POST", "/api/ai/draft-letter", {
        roughIdea,
        language,
        recipient: form.getValues("recipient"),
        sender: form.getValues("sender")
      });
      const data = await res.json();
      form.setValue("subject", data.subject);
      form.setValue("body", data.body);
      toast({ title: "AI Draft Ready", description: "Aap niche ke 'Edit Box' mein badlav kar sakte hain." });
    } catch (err: any) {
      toast({ title: "AI Offline/Error", description: err.message || "Connection failure", variant: "destructive" });
    } finally {
      setIsDrafting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleFullPrint = async () => {
    const data = form.getValues();
    const attachmentData = await Promise.all(attachments.map(async (file) => {
      return new Promise<{ name: string, type: string, data: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          name: file.name,
          type: file.type,
          data: reader.result as string
        });
        reader.readAsDataURL(file);
      });
    }));

    await generateCoveringLetterPDF({ ...data, attachmentData }, false);
    saveMutation.mutate({ ...data, roughIdea, language, attachments: JSON.stringify(attachmentData.map(a => a.name)) });
  };

  const loadFromHistory = (letter: any) => {
    form.reset(letter);
    setRoughIdea(letter.roughIdea || "");
    setLanguage(letter.language as any || "English");
    toast({ title: "History Loaded", description: `Letter No ${letter.letterNo} load ho gaya hai.` });
  };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-20 overflow-x-hidden">
      <div className="max-w-[1700px] mx-auto px-6 py-6">
        <PageHeader title="Official Correspondence" subtitle="AI-Powered Letter Drafting & Digital Archiving" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
          
          {/* Left: Form & Drafting */}
          <div className="space-y-6">
            <Card className="shadow-2xl border-none ring-1 ring-slate-200 rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-white border-b pb-4 px-8 pt-8">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" /> Letter Form
                  </CardTitle>
                  <div className="flex bg-slate-100 p-1 rounded-2xl">
                    <Button variant={language === "English" ? "default" : "ghost"} size="sm" className="rounded-xl h-8 font-bold" onClick={() => setLanguage("English")}>English</Button>
                    <Button variant={language === "Hindi" ? "default" : "ghost"} size="sm" className="rounded-xl h-8 font-bold" onClick={() => setLanguage("Hindi")}>Hindi</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                
                {/* 1. STICKY HEADER */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-purple-600 ml-1">Office Letterhead (Sticky - Auto Saves)</Label>
                  <Textarea {...form.register("header")} className="h-20 bg-purple-50/30 border-purple-100 rounded-2xl font-bold text-center text-sm leading-relaxed" placeholder="DEPARTMENT OF POSTS, INDIA\nOffice of the Manager..." />
                </div>

                <Separator />

                {/* 2. RECIPIENT (TO) */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">To (Recipient Address)</Label>
                  <Textarea {...form.register("recipient")} className="h-24 bg-slate-50 rounded-2xl border-slate-200" placeholder="e.g. The Superintendent, RMS X Division..." />
                </div>

                {/* 3. NO & DATED */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Letter Reference No</Label>
                    <Input {...form.register("letterNo")} className="h-12 bg-slate-50 rounded-2xl" placeholder="e.g. MGR/2026/01" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Date</Label>
                    <Input type="date" {...form.register("date")} className="h-12 bg-slate-50 rounded-2xl" />
                  </div>
                </div>

                {/* 4. SUB & REF */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Subject (Sub:)</Label>
                    <Input {...form.register("subject")} className="h-12 bg-slate-50 rounded-2xl font-bold" placeholder="Regarding official mail transfer..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Reference (Ref:)</Label>
                    <Input {...form.register("reference")} className="h-12 bg-slate-50 rounded-2xl italic" placeholder="e.g. D.2-16/61 dated 07.07.2025" />
                  </div>
                </div>

                <Separator />

                {/* 5. AI DRAFTING ASSISTANT */}
                <div className="p-6 bg-slate-900 rounded-[2.5rem] space-y-4 border-4 border-slate-800 shadow-2xl">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Drafting Assistant (Write simple points)
                  </Label>
                  <Textarea value={roughIdea} onChange={(e) => setRoughIdea(e.target.value)} className="min-h-[100px] bg-white/5 border-white/10 text-white rounded-[1.5rem] focus:ring-purple-500" placeholder="e.g. Printer repair ke liye technician bhejne ka anurodh karein..." />
                  <Button onClick={handleAIDraft} disabled={isDrafting} className="w-full h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-900/20 active:scale-95 transition-all">
                    {isDrafting ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Sparkles className="w-6 h-6 mr-2" />} Draft Proposal using AI
                  </Button>
                </div>

                {/* 6. EDIT TOOL BOX (FINAL CONTENT) */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-black uppercase text-[#D41217] ml-1 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Final Letter Body (Edit Box)
                  </Label>
                  <Textarea {...form.register("body")} className="min-h-[350px] bg-white border-2 border-slate-100 rounded-[2rem] p-8 leading-relaxed font-medium shadow-inner text-base" />
                </div>

                {/* 7. SIGNATURE (SENDER) */}
                <Card className="bg-slate-50 border-dashed border-slate-200">
                  <CardContent className="p-6 grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Your Full Name</Label>
                      <Input {...form.register("sender")} className="h-12 bg-white rounded-2xl font-black" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-slate-500 ml-1">Your Designation / Department</Label>
                      <Textarea {...form.register("designation")} className="h-20 bg-white rounded-2xl text-xs" />
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={handleFullPrint} className="w-full h-16 bg-[#D41217] hover:bg-red-700 text-white rounded-[2rem] font-black uppercase tracking-widest text-lg shadow-xl shadow-red-200 transition-all active:scale-95">
                  <Send className="w-6 h-6 mr-3" /> Save & Export Official PDF
                </Button>
              </CardContent>
            </Card>

            {/* LETTER HISTORY */}
            <Card className="shadow-xl border-none ring-1 ring-slate-100 rounded-[2rem] overflow-hidden">
               <CardHeader className="bg-slate-50/50 px-8 py-4 border-b">
                  <CardTitle className="text-sm font-black uppercase text-slate-500 flex items-center gap-2">
                     <History className="w-4 h-4" /> ARCHIVE HISTORY
                  </CardTitle>
               </CardHeader>
               <CardContent className="p-0">
                  {isLoadingHistory ? (
                      <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                  ) : (
                    <div className="divide-y max-h-[400px] overflow-auto">
                      {letters.map((letter) => (
                        <div key={letter.id} className="p-4 hover:bg-slate-50 cursor-pointer group flex justify-between items-center" onClick={() => loadFromHistory(letter)}>
                           <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-[#D41217] uppercase mb-1">{letter.letterNo || "NO REF"}</p>
                              <p className="text-sm font-bold text-slate-800 truncate pr-4">{letter.subject || "No Subject"}</p>
                           </div>
                           <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(letter.id); }}>
                              <Trash2 className="w-4 h-4" />
                           </Button>
                        </div>
                      ))}
                    </div>
                  )}
               </CardContent>
            </Card>
          </div>

          {/* Right: LIVE PDF PREVIEW SIDEBAR */}
          <div className="hidden lg:block sticky top-24">
            <Card className="shadow-2xl border-none ring-4 ring-slate-100 rounded-[3rem] overflow-hidden h-[calc(100vh-140px)] bg-slate-200 flex flex-col">
              <div className="bg-white px-8 py-5 border-b flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="bg-red-50 p-2.5 rounded-2xl">
                       <Eye className="w-6 h-6 text-[#D41217]" />
                    </div>
                    <div>
                       <CardTitle className="text-sm font-black uppercase text-slate-900 leading-none tracking-tight">Official Preview</CardTitle>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                          Auto-generating
                       </p>
                    </div>
                 </div>
              </div>
              <div className="flex-1 bg-slate-100 p-8 overflow-hidden">
                 {previewUrl ? (
                    <iframe src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} className="w-full h-full border-none shadow-2xl rounded-sm scale-110 origin-top" title="Live Preview" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                       <Loader2 className="w-12 h-12 animate-spin opacity-20" />
                       <p className="text-[10px] font-black uppercase tracking-[0.3em]">Preparing Preview...</p>
                    </div>
                 )}
              </div>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
