"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, X, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { formatMinutesToHours } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const res = await fetch("/api/approvals?status=PENDING");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approvals"] });
      toast.success("Approval updated!");
      setRejectModal(null);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate({ id, status: "APPROVED" });
  };

  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (rejectModal) {
      approveMutation.mutate({
        id: rejectModal.id,
        status: "REJECTED",
        reason: rejectReason,
      });
    }
  };

  const pendingCount = data?.approvals?.length || 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-12 md:pl-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Pending Approvals</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            {pendingCount} {pendingCount === 1 ? "entry" : "entries"} awaiting approval
          </p>
        </div>
      </div>

      {pendingCount === 0 ? (
        <Card>
          <CardContent className="py-8 md:py-12">
            <div className="text-center">
              <Check className="h-10 w-10 md:h-12 md:w-12 text-green-400 mx-auto mb-4" />
              <p className="text-base md:text-lg font-medium">All caught up!</p>
              <p className="text-sm md:text-base text-gray-400 mt-1">No pending approvals at the moment</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 md:space-y-4">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            data?.approvals?.map((approval: any, index: number) => (
              <motion.div
                key={approval.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card>
                  <CardContent className="p-3 md:py-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3 md:gap-4">
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-dark-600 font-semibold text-sm md:text-base flex-shrink-0">
                          {approval.entry.employee.firstName[0]}
                          {approval.entry.employee.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {approval.entry.employee.firstName} {approval.entry.employee.lastName}
                          </p>
                          <p className="text-xs md:text-sm text-gray-400">
                            {format(new Date(approval.entry.date), "EEE, MMM d, yyyy")}
                          </p>
                          
                          <div className="mt-2 md:mt-3 space-y-1 md:space-y-2">
                            {approval.entry.segments.map((seg: any) => (
                              <div
                                key={seg.id}
                                className="flex flex-wrap items-center gap-2 text-xs md:text-sm"
                              >
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: seg.project?.color || "#00f5ff" }}
                                />
                                <span className="text-gray-300 truncate max-w-[100px] md:max-w-none">{seg.project?.name}</span>
                                <span className="text-gray-500">
                                  {seg.startTime} - {seg.endTime}
                                </span>
                                <span className="text-neon-cyan font-medium">
                                  {formatMinutesToHours(seg.durationMinutes)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {approval.entry.isFullDay && (
                            <Badge variant="info" className="mt-2">
                              Full Day
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 md:flex-shrink-0">
                        <Button
                          variant="success"
                          size="sm"
                          className="flex-1 md:flex-auto"
                          onClick={() => handleApprove(approval.id)}
                          isLoading={approveMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Approve</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 md:flex-auto"
                          onClick={() => setRejectModal({ id: approval.id })}
                        >
                          <X className="h-4 w-4" />
                          <span className="hidden sm:inline ml-1">Reject</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title="Reject Entry"
      >
        <form onSubmit={handleReject} className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-300">
              Please provide a reason for rejecting this time entry.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rejection Reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-24 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm"
              placeholder="Enter reason for rejection..."
              required
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRejectModal(null)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              isLoading={approveMutation.isPending}
              className="w-full sm:w-auto"
            >
              Reject Entry
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
