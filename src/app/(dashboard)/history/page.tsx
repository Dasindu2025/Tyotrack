"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Filter, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/skeleton";
import { format, subDays } from "date-fns";
import { formatMinutesToHours } from "@/lib/utils";

export default function HistoryPage() {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
    projectId: "",
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects?active=true");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["time-entries", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (filters.projectId) params.append("projectId", filters.projectId);
      
      const res = await fetch(`/api/time-entries?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const statusColors = {
    DRAFT: "default",
    PENDING: "warning",
    APPROVED: "success",
    REJECTED: "error",
    LOCKED: "info",
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Work History</h1>
        <p className="text-gray-400 mt-1">View your time entry history</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project
              </label>
              <Select
                value={filters.projectId}
                onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                options={projectsData?.projects?.map((p: any) => ({
                  value: p.id,
                  label: p.name,
                })) || []}
                placeholder="All Projects"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : !data?.entries?.length ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No entries found for the selected period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.entries.map((entry: any, index: number) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-lg bg-surface-light border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium">
                        {format(new Date(entry.date), "EEEE, MMMM d, yyyy")}
                      </p>
                      <Badge
                        variant={statusColors[entry.status as keyof typeof statusColors]}
                        className="mt-1"
                      >
                        {entry.status}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-neon-cyan">
                        {formatMinutesToHours(
                          entry.segments.reduce((sum: number, s: any) => sum + s.durationMinutes, 0)
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {entry.segments.map((seg: any) => (
                      <div
                        key={seg.id}
                        className="flex items-center justify-between py-2 border-t border-white/5"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: seg.project?.color || "#00f5ff" }}
                          />
                          <span className="font-medium">{seg.project?.name}</span>
                          <span className="text-gray-500">
                            {seg.startTime} - {seg.endTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-neon-cyan font-medium">
                            {formatMinutesToHours(seg.durationMinutes)}
                          </span>
                          <div className="flex gap-2 text-xs text-gray-500">
                            {seg.dayMinutes > 0 && (
                              <span className="text-yellow-400">D:{seg.dayMinutes}m</span>
                            )}
                            {seg.eveningMinutes > 0 && (
                              <span className="text-orange-400">E:{seg.eveningMinutes}m</span>
                            )}
                            {seg.nightMinutes > 0 && (
                              <span className="text-indigo-400">N:{seg.nightMinutes}m</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {entry.notes && (
                    <p className="text-sm text-gray-400 mt-3 pt-3 border-t border-white/5">
                      {entry.notes}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
