"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { X, Clock, Trash2, Edit, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatMinutesToHours } from "@/lib/utils";
import toast from "react-hot-toast";

interface DayDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  entries: any[];
  onAddEntry: () => void;
  onRefetch: () => void;
}

export function DayDrawer({
  isOpen,
  onClose,
  date,
  entries,
  onAddEntry,
  onRefetch,
}: DayDrawerProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filter entries for selected date
  const dayEntries = entries.filter((entry) => {
    return entry.segments.some((seg: any) => {
      const segDate = format(new Date(seg.date), "yyyy-MM-dd");
      const selectedDate = date ? format(date, "yyyy-MM-dd") : null;
      return segDate === selectedDate;
    });
  });

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    
    setIsDeleting(entryId);
    try {
      const res = await fetch(`/api/time-entries/${entryId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      
      toast.success("Entry deleted");
      onRefetch();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const statusColors = {
    DRAFT: "default",
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "error",
    LOCKED: "info",
  } as const;

  if (!isOpen || !date) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full max-w-md glass border-l border-white/10 z-50 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold">
              {format(date, "EEEE, MMMM d")}
            </h2>
            <p className="text-sm text-gray-400">
              {dayEntries.length} {dayEntries.length === 1 ? "entry" : "entries"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {dayEntries.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No entries for this day</p>
              <Button onClick={onAddEntry} className="mt-4">
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </div>
          ) : (
            dayEntries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-white/10 bg-surface-light p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <Badge variant={statusColors[entry.status as keyof typeof statusColors]}>
                    {entry.status}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={isDeleting === entry.id || entry.status === "LOCKED"}
                      className="p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {entry.segments
                  .filter((seg: any) => {
                    const segDate = format(new Date(seg.date), "yyyy-MM-dd");
                    return segDate === format(date, "yyyy-MM-dd");
                  })
                  .map((seg: any) => (
                    <div
                      key={seg.id}
                      className="flex items-center gap-3 py-2 border-t border-white/5"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: seg.project?.color || "#00f5ff" }}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {seg.project?.name || "Unknown Project"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {seg.startTime} - {seg.endTime}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-neon-cyan">
                          {formatMinutesToHours(seg.durationMinutes)}
                        </p>
                        <div className="flex gap-1 text-xs text-gray-500">
                          {seg.dayMinutes > 0 && <span>D:{seg.dayMinutes}m</span>}
                          {seg.eveningMinutes > 0 && <span>E:{seg.eveningMinutes}m</span>}
                          {seg.nightMinutes > 0 && <span>N:{seg.nightMinutes}m</span>}
                        </div>
                      </div>
                    </div>
                  ))}

                {entry.notes && (
                  <p className="text-sm text-gray-400 mt-2 pt-2 border-t border-white/5">
                    {entry.notes}
                  </p>
                )}
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <Button onClick={onAddEntry} className="w-full">
            <Plus className="h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </motion.div>
    </>
  );
}
