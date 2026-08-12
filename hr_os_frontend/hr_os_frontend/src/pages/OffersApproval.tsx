import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface StoredOffer {
  offer_id: string;
  application_id: string;
  designation: string;
  salary: string;
  joining_date: string;
  status: string;
}

export default function OffersApproval() {
  const queryClient = useQueryClient();
  const [offers, setOffers] = useState<StoredOffer[]>([]);

  useEffect(() => {
    // Load offers from local storage on mount (MVP requirement since no GET /offers exists)
    const pending = JSON.parse(localStorage.getItem("pending_offers") || "[]");
    setOffers(pending);
  }, []);

  const updateLocalOfferStatus = (offerId: string, status: string) => {
    const updated = offers.map(o => o.offer_id === offerId ? { ...o, status } : o);
    setOffers(updated);
    localStorage.setItem("pending_offers", JSON.stringify(updated));
  };

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      // Exactly matching the backend API path and skipping body
      // POST /offers/{offer_id}/approve
      return await api.post(`/offers/${id}/approve`);
    },
    onSuccess: (_, offerId) => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast.success("Offer approved and processing");
      updateLocalOfferStatus(offerId, "APPROVED");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || error.response?.data?.error || "Failed to approve offer");
    }
  });

  const handleReject = (offerId: string) => {
    // API doesn't support rejection natively yet, updating local state only as requested
    toast.success("Offer rejected locally.");
    updateLocalOfferStatus(offerId, "REJECTED");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Offers Approval</h1>
        <p className="text-muted-foreground">Review and approve pending offer letters.</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application ID</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No pending offers to review.
                </TableCell>
              </TableRow>
            ) : (
              offers.map((offer) => (
                <TableRow key={offer.offer_id}>
                  <TableCell className="font-mono text-xs">{offer.application_id.slice(0, 8)}...</TableCell>
                  <TableCell className="font-medium">{offer.designation}</TableCell>
                  <TableCell>${Number(offer.salary).toLocaleString()}</TableCell>
                  <TableCell>{offer.joining_date}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={
                        offer.status === "APPROVED" 
                          ? "bg-green-500/10 text-green-500 border-green-500/20" 
                          : offer.status === "REJECTED"
                          ? "bg-red-500/10 text-red-500 border-red-500/20"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                      }
                    >
                      {offer.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {offer.status === "PENDING_APPROVAL" && (
                      <div className="flex justify-end gap-2">
                         <Button 
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleReject(offer.offer_id)}
                            disabled={approveMutation.isPending}
                          >
                            Reject
                         </Button>
                         <Button 
                           size="sm" 
                           onClick={() => approveMutation.mutate(offer.offer_id)}
                           disabled={approveMutation.isPending}
                         >
                            Approve
                         </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
