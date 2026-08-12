import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as leaveApi from "@/lib/leaveApi";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ActionFormProps {
  formType: "LEAVE_APPLICATION" | "IT_TICKET";
  fields: any[];
  onComplete: (data: any) => void;
}

export function ActionForm({ formType, fields, onComplete }: ActionFormProps) {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm();
  const [leaveTypes, setLeaveTypes] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (formType === "LEAVE_APPLICATION") {
      leaveApi.getLeaveTypes().then(setLeaveTypes);
    }
  }, [formType]);

  const onSubmit = async (data: any) => {
    try {
      if (formType === "LEAVE_APPLICATION") {
        await leaveApi.applyLeave(data);
        toast.success("Leave applied successfully!");
      } else if (formType === "IT_TICKET") {
        // Mock IT Ticket Submission
        toast.success("IT Ticket raised successfully!");
      }
      onComplete(data);
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    }
  };

  return (
    <div className="mt-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4 shadow-2xl">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4 flex items-center gap-2">
         {formType.replace("_", " ")} Request
      </h4>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left">
        {fields.map((f) => (
          <div key={f.name} className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold px-1">{f.label}</Label>
            
            {f.type === "select" ? (
              <Select onValueChange={(val) => setValue(f.name, val)}>
                <SelectTrigger className="bg-black/20 border-white/10 text-xs h-9 text-white">
                  <SelectValue placeholder={`Select ${f.label}`} />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {formType === "LEAVE_APPLICATION" && f.name === "leave_type_id" ? (
                    leaveTypes.map(lt => (
                      <SelectItem key={lt.id} value={lt.id} className="text-xs">{lt.name}</SelectItem>
                    ))
                  ) : (
                    f.options?.map((opt: string) => (
                      <SelectItem key={opt} value={opt} className="text-xs">{opt}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : f.type === "textarea" ? (
              <Textarea 
                {...register(f.name)} 
                className="bg-black/20 border-white/10 text-xs min-h-[80px] text-white" 
                placeholder={f.label}
              />
            ) : (
              <Input 
                type={f.type} 
                {...register(f.name)} 
                className="bg-black/20 border-white/10 text-xs h-9 text-white"
              />
            )}
          </div>
        ))}

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-primary text-white h-9 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Send"}
        </Button>
      </form>
    </div>
  );
}
