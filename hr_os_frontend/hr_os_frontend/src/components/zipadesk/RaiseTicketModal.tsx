import { useState } from "react";
import { useCreateTicket } from "@/lib/ticketApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface RaiseTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RaiseTicketModal({ open, onOpenChange }: RaiseTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("IT");
  const [priority, setPriority] = useState("MEDIUM");

  const createTicket = useCreateTicket();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    await createTicket.mutateAsync({
      title,
      description,
      category,
      priority,
    });
    
    setTitle("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900/95 border-white/10 backdrop-blur-xl text-slate-100 rounded-3xl overflow-hidden p-0 animate-in fade-in zoom-in duration-300">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Raise a Service Request
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Tell us what you need help with. Our teams will get on it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-slate-300 font-medium">Subject</Label>
              <Input
                id="title"
                placeholder="Briefly describe the issue..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-blue-500/50 transition-all rounded-xl"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category" className="text-slate-300 font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-slate-100">
                  <SelectItem value="IT">IT Support</SelectItem>
                  <SelectItem value="ADMIN">Administrative</SelectItem>
                  <SelectItem value="FINANCE">Finance & Payroll</SelectItem>
                  <SelectItem value="HR">Human Resources</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-slate-300 font-medium">Priority</Label>
              <RadioGroup value={priority} onValueChange={setPriority} className="flex gap-3">
                {["LOW", "MEDIUM", "HIGH"].map((p) => (
                  <div key={p} className={`flex items-center space-x-2 bg-white/5 px-3 py-2 rounded-xl border transition-all cursor-pointer ${priority === p ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/5'}`}>
                    <RadioGroupItem value={p} id={`p-${p}`} className="sr-only" />
                    <Label htmlFor={`p-${p}`} className={`text-xs font-bold cursor-pointer uppercase tracking-tight ${priority === p ? 'text-blue-400' : 'text-slate-400'}`}>
                      {p}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-slate-300 font-medium">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide more details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-white/5 border-white/10 focus:border-blue-500/50 transition-all rounded-xl min-h-[120px]"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white hover:bg-white/5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTicket.isPending}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
            >
              {createTicket.isPending ? "Raising..." : "Raise Ticket"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
