import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import * as leaveApi from "@/lib/leaveApi";

interface ActionFormProps {
  form_type: "leave" | "ticket";
  fields: any[];
  onSuccess: (data: any) => void;
}

export function ActionForm({ form_type, fields, onSuccess }: ActionFormProps) {
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data: any) => {
    try {
      if (form_type === "leave") {
        await leaveApi.applyLeave(data);
      } else {
        // Mock IT Ticket submit
        await new Promise(res => setTimeout(res, 800));
      }
      toast.success(`${form_type.charAt(0).toUpperCase() + form_type.slice(1)} submitted successfully!`);
      onSuccess(data);
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    }
  };

  return (
    <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
         Complete your {form_type} request
      </h4>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {fields.map((f) => (
          <div key={f.name} className="space-y-1">
            <Label className="text-[10px] font-bold text-slate-600 px-1">{f.label}</Label>
            
            {f.type === "dropdown" ? (
              <Select onValueChange={(val) => setValue(f.name, val)}>
                <SelectTrigger className="bg-white border-slate-200 text-xs h-9 rounded-xl text-slate-800">
                  <SelectValue placeholder={`Select ${f.label}`} />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200">
                  {f.options?.map((opt: any, index: number) => {
                    const isObj = typeof opt === "object" && opt !== null;
                    const value = isObj ? opt.value : opt;
                    const label = isObj ? opt.label : opt;
                    
                    let valueStr = "";
                    if (value !== null && value !== undefined) {
                      if (typeof value === "object") {
                        valueStr = value.$oid || JSON.stringify(value);
                      } else {
                        valueStr = String(value);
                      }
                    }
                    
                    const labelStr = typeof label === "object" && label !== null 
                      ? (label.$oid || JSON.stringify(label)) 
                      : String(label);

                    return (
                      <SelectItem key={valueStr || index} value={valueStr} className="text-xs">
                        {labelStr}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Input 
                type={f.type === "date" ? "date" : "text"} 
                {...register(f.name)} 
                className="bg-white border-slate-200 text-xs h-9 rounded-xl text-slate-800"
                placeholder={f.label}
              />
            )}
          </div>
        ))}

        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-primary text-white h-9 text-xs font-bold rounded-xl shadow-md hover:opacity-90 transition-all mt-2"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : `Submit ${form_type}`}
        </Button>
      </form>
    </div>
  );
}
