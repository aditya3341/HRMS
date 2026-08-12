import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { employeeApi } from "@/lib/employeeApi";

interface HRDataPickerProps {
  type: "roles" | "employees";
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const SYSTEM_ROLES = [
  "SUPER_ADMIN",
  "ADMIN",
  "HR_ADMIN",
  "MANAGER",
  "EMPLOYEE",
  "FIELD_EMPLOYEE",
];

export function HRDataPicker({ type, value, onChange, placeholder }: HRDataPickerProps) {
  const [open, setOpen] = React.useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ["employee-lookup"],
    queryFn: () => employeeApi.getEmployeeLookup(),
    enabled: type === "employees",
  });

  const options = type === "roles" 
    ? SYSTEM_ROLES.map(r => ({ label: r, value: r }))
    : employees.map((e: any) => ({ 
        label: `${e.first_name} ${e.last_name}`, 
        value: e.id 
      }));

  const handleSelect = (currentValue: string) => {
    const newValue = value.includes(currentValue)
      ? value.filter((v) => v !== currentValue)
      : [...value, currentValue];
    onChange(newValue);
  };

  const removeValue = (val: string) => {
    onChange(value.filter((v) => v !== val));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-lg border border-white/10 bg-black/20">
        {value.length === 0 && (
          <span className="text-xs text-slate-500 italic p-1">No items selected</span>
        )}
        {value.map((val) => {
          const option = options.find((o) => o.value === val);
          return (
            <Badge 
              key={val} 
              variant="secondary" 
              className="pl-2 pr-1 py-0.5 gap-1 bg-primary/20 hover:bg-primary/30 text-primary border-primary/20"
            >
              <span className="text-[10px] font-bold">{option?.label || val}</span>
              <button
                type="button"
                onClick={() => removeValue(val)}
                className="hover:bg-primary/40 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          );
        })}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-white/[0.03] border-white/10 hover:bg-white/5 h-9"
          >
            <span className="text-xs text-slate-400">
              {placeholder || `Add ${type}...`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 bg-slate-900 border-white/10 shadow-2xl">
          <Command className="bg-transparent">
            <CommandInput placeholder={`Search ${type}...`} className="text-xs" />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="text-xs cursor-pointer hover:bg-white/5"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(option.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
