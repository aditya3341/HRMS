import { useState } from "react";
import { User, Mail, Phone, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateOfferModal } from "./CreateOfferModal";
import type { Application } from "@/lib/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { offerApi } from "@/lib/offerApi";
import { toast } from "sonner";

interface CandidateCardProps {
  application: Application;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, applicationId: string) => void;
}

const formatStatus = (status: string) => {
  if (!status) return "";
  return status.replace(/_/g, " ").toUpperCase();
};

const getStatusColor = (status: string) => {
  if (!status) return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  const normStatus = status.toLowerCase();

  switch (normStatus) {
    case "applied":
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "l1":
    case "l2":
    case "l3":
    case "l4":
      return "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
    case "selected":
      return "bg-teal-500/10 text-teal-600 border-teal-500/20";
    case "pending_approval":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "approved":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "sent":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "accepted":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "joined":
    case "hired":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "rejected":
      return "bg-red-500/10 text-red-500 border-red-500/20";
    default:
      return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  }
};

export function CandidateCard({ application, onDragStart }: CandidateCardProps) {
  const queryClient = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  const offer = application.offer;

  // ✅ Normalize everything
  const offerStatus = offer?.status?.toLowerCase();
  const appStatus = application.status?.toLowerCase();

  // ✅ Single source of truth
  const displayStatus = offerStatus || appStatus;

  // ---------------- MUTATIONS ----------------

  const approveMutation = useMutation({
    mutationFn: (offerId: string) => offerApi.approveOffer(offerId),
    onSuccess: () => {
      toast.success("Offer approved");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason: string }) =>
      offerApi.rejectOffer(offerId, reason),
    onSuccess: () => {
      toast.success("Offer rejected");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setShowRejectInput(false);
      setRejectReason("");
    },
  });

  const sendMutation = useMutation({
    mutationFn: (offerId: string) => offerApi.sendOffer(offerId),
    onSuccess: () => {
      toast.success("Offer sent");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (offerId: string) => offerApi.acceptOffer(offerId),
    onSuccess: () => {
      toast.success("Offer accepted");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (offerId: string) => offerApi.declineOffer(offerId),
    onSuccess: () => {
      toast.success("Offer declined");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const markJoinedMutation = useMutation({
    mutationFn: (offerId: string) => offerApi.markJoined(offerId),
    onSuccess: () => {
      toast.success("Candidate joined");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, application.id)}
      className="bg-card border rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors space-y-3 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="font-medium text-sm truncate">
          {application.candidate_name}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1.5 text-xs text-muted-foreground flex-grow">
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate">{application.email}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5" />
          <span>{application.phone}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {new Date(application.created_at || new Date()).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Status + Actions */}
      <div className="pt-3 border-t space-y-3">
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${getStatusColor(displayStatus)}`}
        >
          {formatStatus(displayStatus)}
        </Badge>

        {offer && (
          <div className="space-y-2">

            {offerStatus === "pending_approval" && (
              <div className="flex gap-2">
                <Button onClick={() => approveMutation.mutate(offer.id)} className="w-full text-xs">
                  Approve
                </Button>
                <Button variant="destructive" onClick={() => setShowRejectInput(true)} className="w-full text-xs">
                  Reject
                </Button>
              </div>
            )}

            {offerStatus === "approved" && (
              <Button onClick={() => sendMutation.mutate(offer.id)} className="w-full text-xs">
                Send Offer
              </Button>
            )}

            {offerStatus === "sent" && (
              <div className="flex gap-2">
                <Button onClick={() => acceptMutation.mutate(offer.id)} className="w-full text-xs">
                  Accept
                </Button>
                <Button variant="destructive" onClick={() => declineMutation.mutate(offer.id)} className="w-full text-xs">
                  Decline
                </Button>
              </div>
            )}

            {offerStatus === "accepted" && (
              <Button
                onClick={() => markJoinedMutation.mutate(offer.id)}
                className="w-full text-xs bg-purple-600 text-white"
              >
                Mark as Joined
              </Button>
            )}

            {offerStatus === "joined" && (
              <Button disabled className="w-full text-xs">
                Hired ✅
              </Button>
            )}
          </div>
        )}

        {/* Create Offer */}
        {appStatus === "selected" && !offer && (
          <CreateOfferModal applicationId={application.id} />
        )}
      </div>
    </div>
  );
}