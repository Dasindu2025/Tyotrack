"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import toast from "react-hot-toast";

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date?: Date | null;
  onSuccess: () => void;
  editEntry?: any;
}

export function TimeEntryModal({
  isOpen,
  onClose,
  date,
  onSuccess,
  editEntry,
}: TimeEntryModalProps) {
  const [formData, setFormData] = useState({
    date: date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    projectId: "",
    startTime: "09:00",
    endTime: "17:00",
    notes: "",
    isFullDay: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update date when prop changes
  useEffect(() => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        date: format(date, "yyyy-MM-dd"),
      }));
    }
  }, [date]);

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects?active=true");
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
  });

  const projects = projectsData?.projects || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create entry");
      }

      toast.success("Time entry created!");
      onSuccess();
      
      // Reset form
      setFormData({
        date: format(new Date(), "yyyy-MM-dd"),
        projectId: "",
        startTime: "09:00",
        endTime: "17:00",
        notes: "",
        isFullDay: false,
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Time Entry" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date
          </label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData({ ...formData, date: e.target.value })
            }
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Project
          </label>
          <Select
            value={formData.projectId}
            onChange={(e) =>
              setFormData({ ...formData, projectId: e.target.value })
            }
            options={projects.map((p: any) => ({
              value: p.id,
              label: p.name,
            }))}
            placeholder="Select a project"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Time
            </label>
            <Input
              type="time"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Time
            </label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Notes (optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            className="w-full h-20 rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan/50 focus:ring-2 focus:ring-neon-cyan/20"
            placeholder="Add any notes..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="fullDay"
            checked={formData.isFullDay}
            onChange={(e) =>
              setFormData({ ...formData, isFullDay: e.target.checked })
            }
            className="rounded border-white/20 bg-surface text-neon-cyan focus:ring-neon-cyan/50"
          />
          <label htmlFor="fullDay" className="text-sm text-gray-300">
            Full day entry
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}
