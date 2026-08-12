import React from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { HRDataPicker } from "./HRDataPicker";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Settings, Info } from "lucide-react";

interface ConfigFieldMapperProps {
  data: any;
  onChange: (newData: any) => void;
  level?: number;
}

export function ConfigFieldMapper({ data, onChange, level = 0 }: ConfigFieldMapperProps) {
  if (typeof data !== "object" || data === null) return null;

  const handleUpdate = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className={cn("space-y-6", level > 0 && "ml-4 border-l border-white/5 pl-6")}>
      {Object.entries(data).map(([key, value]) => {
        const label = key
          .split("_")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        // 1. Boolean Mapping -> Switch
        if (typeof value === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold text-white group-hover:text-primary transition-colors">{label}</Label>
                <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                   <Info className="w-3 h-3" />
                   <span className="text-[10px] uppercase tracking-wide">Feature Toggle</span>
                </div>
              </div>
              <Switch
                checked={value}
                onCheckedChange={(checked) => handleUpdate(key, checked)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          );
        }

        // 2. Number Mapping -> Slider + Input
        if (typeof value === "number") {
          return (
            <div key={key} className="space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-bold text-slate-300">{label}</Label>
                <span className="text-xs font-mono font-black text-primary bg-primary/10 px-2 py-1 rounded-lg">
                  {value}
                </span>
              </div>
              <div className="flex gap-4 items-center">
                <Slider
                  value={[value]}
                  max={key.includes("radius") ? 2000 : 100}
                  step={key.includes("radius") ? 50 : 1}
                  onValueChange={([val]) => handleUpdate(key, val)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={value}
                  onChange={(e) => handleUpdate(key, parseFloat(e.target.value))}
                  className="w-20 h-8 bg-black/20 border-white/10 text-xs font-mono"
                />
              </div>
            </div>
          );
        }

        // 3. Array Mapping -> Specialized Picker or Tag Cloud
        if (Array.isArray(value)) {
          const isRoleArray = key.includes("roles");
          const isEmployeeArray = key.includes("employee_ids");

          return (
            <div key={key} className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <Label className="text-sm font-bold text-slate-300">{label}</Label>
              <HRDataPicker
                type={isEmployeeArray ? "employees" : "roles"}
                value={value}
                onChange={(newVal) => handleUpdate(key, newVal)}
                placeholder={`Select ${label.toLowerCase()}...`}
              />
            </div>
          );
        }

        // 4. Nested Object Mapping -> Recursive Call
        if (typeof value === "object" && value !== null) {
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center gap-2 group cursor-pointer px-1">
                <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                <span className="text-xs font-black uppercase tracking-widest text-primary/60 group-hover:text-primary transition-colors">
                  {label} Section
                </span>
              </div>
              <ConfigFieldMapper
                data={value}
                onChange={(nestedData) => handleUpdate(key, nestedData)}
                level={level + 1}
              />
            </div>
          );
        }

        // 5. Default String Mapping -> Basic Input
        const isPassword = key.includes("api_key") || key.includes("secret") || key.includes("token");

        return (
          <div key={key} className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <Label className="text-sm font-bold text-slate-300">{label}</Label>
            <Input
              type={isPassword ? "password" : "text"}
              value={value as string}
              onChange={(e) => handleUpdate(key, e.target.value)}
              className="bg-black/20 border-white/10 focus:border-primary transition-all text-sm font-mono"
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
          </div>
        );
      })}
    </div>
  );
}
