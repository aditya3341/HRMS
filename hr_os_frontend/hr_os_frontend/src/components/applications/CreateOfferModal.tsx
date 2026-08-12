import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CreateOfferModalProps {
  applicationId: string;
}

export function CreateOfferModal({ applicationId }: CreateOfferModalProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const createOfferMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/offers/", payload);
      return res.data;
    },
    onSuccess: (data, variables) => {
      toast.success("Offer created successfully");
      setIsOpen(false);
      
      // Save offer temporarily in localStorage for MVP approval page
      const existingOffers = JSON.parse(localStorage.getItem("pending_offers") || "[]");
      const newOffer = {
        offer_id: data?.data?.offer_id || `temp_${Date.now()}`,
        application_id: variables.application_id,
        designation: variables.designation,
        salary: variables.offered_salary,
        joining_date: variables.joining_date,
        status: "PENDING_APPROVAL",
      };
      localStorage.setItem("pending_offers", JSON.stringify([...existingOffers, newOffer]));

      // Refresh applications list
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.response?.data?.error || "Failed to create offer");
    },
  });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createOfferMutation.mutate({
      application_id: applicationId,
      designation: fd.get("designation") as string,
      offered_salary: fd.get("salary") as string,
      joining_date: fd.get("joining_date") as string,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full mt-2" onClick={(e) => e.stopPropagation()}>
          Create Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Create Offer</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4 text-left">
          <div className="space-y-2">
            <label htmlFor="designation" className="text-sm font-medium">Designation</label>
            <Input id="designation" name="designation" placeholder="e.g. Frontend Developer" required />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="salary" className="text-sm font-medium">Offered Salary</label>
            <Input id="salary" name="salary" type="number" placeholder="e.g. 80000" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="joining_date" className="text-sm font-medium">Joining Date</label>
            <Input id="joining_date" name="joining_date" type="date" required />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={createOfferMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createOfferMutation.isPending}>
              {createOfferMutation.isPending ? "Creating..." : "Submit Offer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
