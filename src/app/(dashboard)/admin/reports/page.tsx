"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, Calendar, BarChart3, Clock, Sun, Moon, Check, AlertCircle, XCircle, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, subMonths, subYears, startOfMonth, endOfMonth } from "date-fns";
import { formatMinutesToHours } from "@/lib/utils";
import toast from "react-hot-toast";

// Date presets
const datePresets = [
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
  { label: "3 Months", days: 90 },
  { label: "1 Year", days: 365 },
  { label: "10 Years", days: 3650 },
];

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    employeeId: "",
    projectId: "",
    includeStatus: "approved", // approved, pending, all
  });
  const [isExporting, setIsExporting] = useState(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  // Apply date preset
  const applyPreset = (days: number, index: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    setFilters({
      ...filters,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
    });
    setActivePreset(index);
  };

  // Fetch employees
  const { data: usersData } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Fetch projects
  const { data: projectsData } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  // Fetch report data
  const { data, isLoading } = useQuery({
    queryKey: ["reports", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        includeStatus: filters.includeStatus,
      });
      if (filters.employeeId) params.append("employeeId", filters.employeeId);
      if (filters.projectId) params.append("projectId", filters.projectId);
      
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!filters.startDate && !!filters.endDate,
  });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      
      if (!res.ok) throw new Error("Export failed");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `time-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Report exported!");
    } catch (error) {
      toast.error("Failed to export report");
    } finally {
      setIsExporting(false);
    }
  };

  const totals = data?.totals;
  const byProject = totals?.byProject ? Object.values(totals.byProject) : [];
  const byDate = totals?.byDate ? Object.entries(totals.byDate).sort(([a], [b]) => a.localeCompare(b)) : [];
  const byStatus = totals?.byStatus || { approved: { totalMinutes: 0 }, pending: { totalMinutes: 0 }, rejected: { totalMinutes: 0 } };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-12 md:pl-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Reports</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">Generate and export time reports</p>
        </div>
        <Button onClick={handleExport} isLoading={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          {/* Date Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            {datePresets.map((preset, index) => (
              <Button
                key={preset.label}
                variant={activePreset === index ? "default" : "ghost"}
                size="sm"
                onClick={() => applyPreset(preset.days, index)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setActivePreset(null);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                  setActivePreset(null);
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Employee
              </label>
              <Select
                value={filters.employeeId}
                onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                options={usersData?.users?.map((u: any) => ({
                  value: u.id,
                  label: `${u.firstName} ${u.lastName}`,
                })) || []}
                placeholder="All Employees"
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status Filter
              </label>
              <Select
                value={filters.includeStatus}
                onChange={(e) => setFilters({ ...filters, includeStatus: e.target.value })}
                options={[
                  { value: "approved", label: "Approved Only" },
                  { value: "pending", label: "Include Pending" },
                  { value: "all", label: "All (excl. Draft)" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats - Row 1: Hour Types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card glow>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 flex items-center justify-center">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-400">Total Hours</p>
                  <p className="text-lg md:text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-6 md:h-8 w-16 md:w-20" /> : formatMinutesToHours(totals?.totalMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Sun className="h-5 w-5 md:h-6 md:w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-400">Day Hours</p>
                  <p className="text-lg md:text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-6 md:h-8 w-16 md:w-20" /> : formatMinutesToHours(totals?.dayMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-400">Evening Hours</p>
                  <p className="text-lg md:text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-6 md:h-8 w-16 md:w-20" /> : formatMinutesToHours(totals?.eveningMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Moon className="h-5 w-5 md:h-6 md:w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-400">Night Hours</p>
                  <p className="text-lg md:text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-6 md:h-8 w-16 md:w-20" /> : formatMinutesToHours(totals?.nightMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Summary Stats - Row 2: Status Breakdown */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Approved</p>
                  <p className="text-lg md:text-xl font-bold text-green-400">
                    {isLoading ? <Skeleton className="h-6 w-16" /> : formatMinutesToHours(byStatus.approved?.totalMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending</p>
                  <p className="text-lg md:text-xl font-bold text-yellow-400">
                    {isLoading ? <Skeleton className="h-6 w-16" /> : formatMinutesToHours(byStatus.pending?.totalMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rejected</p>
                  <p className="text-lg md:text-xl font-bold text-red-400">
                    {isLoading ? <Skeleton className="h-6 w-16" /> : formatMinutesToHours(byStatus.rejected?.totalMinutes || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Date Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5" />
            Breakdown by Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : byDate.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No data for the selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Date</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Total</th>
                    <th className="text-right py-3 px-2 text-yellow-400 font-medium">Day</th>
                    <th className="text-right py-3 px-2 text-orange-400 font-medium">Evening</th>
                    <th className="text-right py-3 px-2 text-indigo-400 font-medium">Night</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-medium hidden md:table-cell">Projects</th>
                  </tr>
                </thead>
                <tbody>
                  {byDate.map(([date, stats]: [string, any]) => (
                    <tr key={date} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-2 font-medium">{format(new Date(date), "MMM d, yyyy")}</td>
                      <td className="py-3 px-2 text-right text-neon-cyan font-medium">{formatMinutesToHours(stats.totalMinutes)}</td>
                      <td className="py-3 px-2 text-right text-yellow-400">{formatMinutesToHours(stats.dayMinutes)}</td>
                      <td className="py-3 px-2 text-right text-orange-400">{formatMinutesToHours(stats.eveningMinutes)}</td>
                      <td className="py-3 px-2 text-right text-indigo-400">{formatMinutesToHours(stats.nightMinutes)}</td>
                      <td className="py-3 px-2 text-gray-400 hidden md:table-cell">{stats.projects?.join(", ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Project Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Breakdown by Project
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : byProject.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No data for the selected period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-gray-400 font-medium">Project</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium">Total</th>
                    <th className="text-right py-3 px-2 text-yellow-400 font-medium">Day</th>
                    <th className="text-right py-3 px-2 text-orange-400 font-medium">Evening</th>
                    <th className="text-right py-3 px-2 text-indigo-400 font-medium">Night</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-medium w-32 hidden md:table-cell">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {(byProject as any[]).map((project: any) => {
                    const percentage = totals?.totalMinutes 
                      ? (project.totalMinutes / totals.totalMinutes) * 100 
                      : 0;
                    
                    return (
                      <tr key={project.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="font-medium">{project.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-neon-cyan font-medium">{formatMinutesToHours(project.totalMinutes)}</td>
                        <td className="py-3 px-2 text-right text-yellow-400">{formatMinutesToHours(project.dayMinutes)}</td>
                        <td className="py-3 px-2 text-right text-orange-400">{formatMinutesToHours(project.eveningMinutes)}</td>
                        <td className="py-3 px-2 text-right text-indigo-400">{formatMinutesToHours(project.nightMinutes)}</td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-dark-400 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 0.5 }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: project.color }}
                              />
                            </div>
                            <span className="text-xs text-gray-400 w-10 text-right">{percentage.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
