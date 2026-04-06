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
import { Loader2, Sparkles, Send, FileText, Trash2, History, Languages, Paperclip, X, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateCoveringLetterPDF } from "@/lib/pdfGenerator";

export default function CoveringLetter() {
  const { toast } = useToast();
  const [roughIdea, setRoughIdea] = useState("");
  const [language, setLanguage] = useState<"English" | "Hindi">("English");
  const [isDrafting, setIsDrafting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: letters = [], isLoading: isLoadingHistory } = useQuery<any[]>({
    queryKey: ["/api/letters"],
  });

  const form = useForm({
    resolver: zodResolver(insertCoveringLetterSchema),
    defaultValues: {
      letterNo: "",
      date: new Date().toISOString().split('T')[0],
      recipient: "",
      sender: localStorage.getItem("active_employee") ? JSON.parse(localStorage.getItem("active_employee")!).name : "",
      subject: "",
      body: "",
      language: "English",
      roughIdea: ""
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/letters", data);
      return res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/letters"] });
      toast({ 
        title: res.action === "created" ? "Letter Saved" : "Letter Updated", 
        description: `Letter No ${form.getValues("letterNo")} is now in history.` 
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
      return toast({ title: "Rough Idea Khali Hai", description: "Kuch toh likhiye taaki AI draft kar sake.", variant: "destructive" });
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
      toast({ title: "AI Draft Ready", description: "Drafting complete! Aap ise edit kar sakte hain." });
    } catch (err: any) {
      toast({ title: "AI Offline/Error", description: err.message, variant: "destructive" });
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

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handlePrint = async () => {
    const data = form.getValues();
    // Convert files to base64 for PDF merging
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

    generateCoveringLetterPDF({ ...data, attachmentData });
    saveMutation.mutate({ ...data, roughIdea, language, attachments: JSON.stringify(attachmentData.map(a => a.name)) });
  };

  const loadFromHistory = (letter: any) => {
    form.reset(letter);
    setRoughIdea(letter.roughIdea || "");
    setLanguage(letter.language as any || "English");
  };

  return (
    <div className="min-h-screen bg-slate-50/30 pb-20">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <PageHeader title="AI Covering Letter" subtitle="Draft professional official letters in seconds" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          
          {/* Main Drafting Area */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="shadow-xl border-none ring-1 ring-slate-200">
              <CardHeader className="bg-white border-b pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" /> Draft Letter Details
                  </CardTitle>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <Button 
                      variant={language === "English" ? "default" : "ghost"} 
                      size="sm" 
                      className="rounded-lg h-8 text-[11px] font-bold uppercase"
                      onClick={() => setLanguage("English")}
                    >
                      English
                    </Button>
                    <Button 
                      variant={language === "Hindi" ? "default" : "ghost"} 
                      size="sm" 
                      className="rounded-lg h-8 text-[11px] font-bold uppercase"
                      onClick={() => setLanguage("Hindi")}
                    >
                      Hindi
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                
                {/* Header Inputs */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Letter Number</Label>
                    <Input {...form.register("letterNo")} placeholder="e.g. DOP/2026/101" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">Date</Label>
                    <Input type="date" {...form.register("date")} className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">To (Recipient)</Label>
                    <Input {...form.register("recipient")} placeholder="e.g. The Superintendent, Jhansi" className="h-11 rounded-xl" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-slate-500">From (Sender)</Label>
                    <Input {...form.register("sender")} placeholder="e.g. Postmaster, Agra" className="h-11 rounded-xl" />
                  </div>
                </div>

                <Separator />

                {/* AI Rough Idea Area */}
                <div className="space-y-3 p-4 bg-purple-50/50 rounded-2xl border border-purple-100 ring-4 ring-purple-50/30">
                  <Label className="text-[10px] font-black uppercase text-purple-600 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5" /> What do you want to say? (Rough Idea / Hinglish)
                  </Label>
                  <Textarea 
                    value={roughIdea}
                    onChange={(e) => setRoughIdea(e.target.value)}
                    placeholder="Example: Scanner kharab ho gaya hai, technician bhejiye repair ke liye..."
                    className="min-h-[100px] bg-white border-purple-200 focus:ring-purple-200 rounded-xl" 
                  />
                  <Button 
                    onClick={handleAIDraft} 
                    disabled={isDrafting}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold h-12 rounded-xl shadow-lg shadow-purple-200 transition-all active:scale-95"
                  >
                    {isDrafting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                    Draft Professional Letter using AI
                  </Button>
                </div>

                {/* Final Editor Area */}
                <AnimatePresence>
                  {(form.watch("subject") || isDrafting) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <Separator />
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Subject (Drafted)</Label>
                        <Input {...form.register("subject")} className="h-11 font-bold text-slate-800 rounded-xl border-slate-300" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Letter Body (Live Editor)</Label>
                        <Textarea {...form.register("body")} className="min-h-[250px] font-medium leading-relaxed rounded-xl border-slate-300" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Attachments Area */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Attachments (Bills, Photos, Vouchers)
                  </Label>
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-200 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                    <div className="flex flex-col items-center justify-center pt-2 pb-2">
                       <Download className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                       <p className="text-[11px] font-bold text-slate-500 mt-2">Click to Upload JPG or PDF</p>
                    </div>
                    <input type="file" multiple className="hidden" onChange={onFileChange} accept="image/*,application/pdf" />
                  </label>
                  
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 group">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-bold text-slate-600 max-w-[150px] truncate">{file.name}</span>
                        <button onClick={() => removeAttachment(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="button" 
                    onClick={handlePrint}
                    className="flex-1 bg-[#D41217] hover:bg-red-700 h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-red-100 transition-all active:scale-95 text-white"
                  >
                    <Send className="w-5 h-5 mr-3" /> Save & Print Preview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* History Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-lg border-none ring-1 ring-slate-200 sticky top-24">
              <CardHeader className="bg-slate-50/50 border-b pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <History className="w-4 h-4" /> Letter History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 max-h-[70vh] overflow-auto">
                {isLoadingHistory ? (
                  <div className="p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-300" /></div>
                ) : letters.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <FileText className="w-8 h-8 text-slate-200 mx-auto" />
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No previous letters found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {letters.map((letter) => (
                      <div 
                        key={letter.id} 
                        className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group relative"
                        onClick={() => loadFromHistory(letter)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase truncate max-w-[120px]">
                            {letter.letterNo}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">{letter.date}</p>
                        </div>
                        <p className="text-[12px] font-bold text-slate-700 line-clamp-1">{letter.subject}</p>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 italic">To: {letter.recipient}</p>
                        
                        <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2">
                           <button 
                             onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(letter.id); }}
                             className="p-1.5 bg-white shadow-sm ring-1 ring-slate-200 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
