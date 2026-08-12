import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, DollarSign, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
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
import { toast } from "sonner";
import type { Offer, APIResponse } from "@/lib/types";

export default function Offers() {
  const queryClient = useQueryClient();

  const { data: offers, isLoading } = useQuery({
    queryKey: ["offers"],
    queryFn: async () => {
      const res = await api.get("/offers");
      return res;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return await api.post(`/offers/${id}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      toast.success("Offer approved and processing");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Offers</h1>
        <p className="text-muted-foreground">Review and approve offer letters.</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Designation</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : (
              offers?.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell className="font-medium">{offer.designation}</TableCell>
                  <TableCell>{offer.offered_salary}</TableCell>
                  <TableCell>{offer.joining_date}</TableCell>
                  <TableCell>
                    <Badge variant={offer.status === "APPROVED" ? "default" : "outline"}>
                      {offer.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {offer.status !== "APPROVED" && (
                      <Button 
                        size="sm" 
                        onClick={() => approveMutation.mutate(offer.id)}
                        disabled={approveMutation.isPending}
                      >
                         Approve
                      </Button>
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
