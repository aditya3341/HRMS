import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { JobCreate, APIResponse } from "@/lib/types";

export function CreateJobModal() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const canPostJob = hasRole(["SUPER_ADMIN", "ADMIN", "HR", "HR_ADMIN"]);

  const createJobMutation = useMutation({
    mutationFn: async (payload: JobCreate) => {
      return await api.post<any>("/jobs/", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setIsOpen(false);
      toast.success("Job created successfully");
    },
    onError: (error: any) => {
        toast.error(error.response?.data?.error || "Failed to create job");
    }
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createJobMutation.mutate({
      title: fd.get("title") as string,
      description: fd.get("description") as string || "N/A", // Backend might require this, keeping it safe
      location: fd.get("location") as string,
      employment_type: fd.get("employment_type") as any,
      status: "OPEN" // Defaulting to Open as requested
    } as any); // Type assertion to handle backend expected structure if it differs slightly from UI request
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {canPostJob && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Post Job
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">Job Title</label>
            <Input id="title" name="title" placeholder="e.g. Senior Software Engineer" required />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">Location</label>
            <Input id="location" name="location" placeholder="e.g. New York, NY" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="employment_type" className="text-sm font-medium">Employment Type</label>
            <Select name="employment_type" defaultValue="FULL_TIME">
              <SelectTrigger id="employment_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FULL_TIME">Full-time</SelectItem>
                <SelectItem value="PART_TIME">Part-time</SelectItem>
                <SelectItem value="CONTRACT">Contract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={createJobMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createJobMutation.isPending}>
              {createJobMutation.isPending ? "Creating..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
