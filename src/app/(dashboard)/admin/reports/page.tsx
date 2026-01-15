"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Download, Calendar, BarChart3, Clock, Sun, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { formatMinutesToHours } from "@/lib/utils";
import toast from "react-hot-toast";

export default function ReportsPage() {
  const [filters, setFilters] = useState({
    startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    employeeId: "",
    projectId: "",
  });
  const [isExporting, setIsExporting] = useState(false);

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
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["reports", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-gray-400 mt-1">Generate and export time reports</p>
        </div>
        <Button onClick={handleExport} isLoading={isExporting}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card glow>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Hours</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      formatMinutesToHours(totals?.totalMinutes || 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Sun className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Day Hours</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      formatMinutesToHours(totals?.dayMinutes || 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Evening Hours</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      formatMinutesToHours(totals?.eveningMinutes || 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Moon className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Night Hours</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? (
                      <Skeleton className="h-8 w-20" />
                    ) : (
                      formatMinutesToHours(totals?.nightMinutes || 0)
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hours by Project */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Hours by Project
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
            <div className="space-y-4">
              {(byProject as any[]).map((project: any) => {
                const percentage = totals?.totalMinutes 
                  ? (project.totalMinutes / totals.totalMinutes) * 100 
                  : 0;
                
                return (
                  <div key={project.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        <span className="font-medium">{project.name}</span>
                      </div>
                      <span className="text-neon-cyan font-medium">
                        {formatMinutesToHours(project.totalMinutes)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-400 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
