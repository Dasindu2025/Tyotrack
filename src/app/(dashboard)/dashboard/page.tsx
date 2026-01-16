"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Sun,
  Sunset,
  Moon,
  Users,
  FolderKanban,
  AlertCircle,
  Check,
  X,
  TrendingUp,
  Activity,
  FileBarChart,
  UserPlus,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, formatMinutesToHours } from "@/lib/utils";
import { TimeEntryModal } from "@/components/features/time-entry-modal";
import { DayDrawer } from "@/components/features/day-drawer";
import { useAuth } from "@/hooks/use-auth";
import toast from "react-hot-toast";

// Admin Dashboard Component
function AdminDashboard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason: "" }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      toast.success("Entry updated!");
    },
    onError: () => {
      toast.error("Failed to update");
    },
  });

  const stats = data?.stats || {};
  const totalMonth = stats.hoursMonth || 0;

  // Calculate percentages for donut
  const dayPercent = totalMonth > 0 ? (stats.dayMinutes / totalMonth) * 100 : 33;
  const eveningPercent = totalMonth > 0 ? (stats.eveningMinutes / totalMonth) * 100 : 33;
  const nightPercent = totalMonth > 0 ? (stats.nightMinutes / totalMonth) * 100 : 34;

  const getActivityText = (log: any) => {
    const action = log.action.toLowerCase();
    const entity = log.entityType.replace("TimeEntry", "time entry").toLowerCase();
    return `${log.userName} ${action}d ${entity}`;
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-12 md:pl-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            Company overview and quick actions
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card glow>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-neon-cyan" />
                </div>
                <p className="text-xs text-gray-400">Today</p>
                <p className="text-xl font-bold">{formatMinutesToHours(stats.hoursToday || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card glow>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-lg bg-neon-purple/20 flex items-center justify-center mb-2">
                  <CalendarIcon className="h-5 w-5 text-neon-purple" />
                </div>
                <p className="text-xs text-gray-400">This Week</p>
                <p className="text-xl font-bold">{formatMinutesToHours(stats.hoursWeek || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card glow>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center mb-2">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <p className="text-xs text-gray-400">This Month</p>
                <p className="text-xl font-bold">{formatMinutesToHours(stats.hoursMonth || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <p className="text-xs text-gray-400">Employees</p>
                <p className="text-xl font-bold">{stats.activeEmployees || 0}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-2">
                  <FolderKanban className="h-5 w-5 text-purple-400" />
                </div>
                <p className="text-xs text-gray-400">Projects</p>
                <p className="text-xl font-bold">{stats.activeProjects || 0}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={stats.pendingApprovals > 0 ? "border-yellow-500/50" : ""}>
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center mb-2">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                </div>
                <p className="text-xs text-gray-400">Pending</p>
                <p className="text-xl font-bold text-yellow-400">{stats.pendingApprovals || 0}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Hour Breakdown & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hour Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hour Distribution (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8">
              {/* Simple donut visualization */}
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="64" cy="64" r="50" fill="none" stroke="#1e293b" strokeWidth="12" />
                  <circle 
                    cx="64" cy="64" r="50" fill="none" 
                    stroke="#facc15" strokeWidth="12"
                    strokeDasharray={`${dayPercent * 3.14} 314`}
                    strokeDashoffset="0"
                  />
                  <circle 
                    cx="64" cy="64" r="50" fill="none" 
                    stroke="#f97316" strokeWidth="12"
                    strokeDasharray={`${eveningPercent * 3.14} 314`}
                    strokeDashoffset={`-${dayPercent * 3.14}`}
                  />
                  <circle 
                    cx="64" cy="64" r="50" fill="none" 
                    stroke="#6366f1" strokeWidth="12"
                    strokeDasharray={`${nightPercent * 3.14} 314`}
                    strokeDashoffset={`-${(dayPercent + eveningPercent) * 3.14}`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold">{formatMinutesToHours(totalMonth)}</span>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span className="text-sm text-gray-400">Day</span>
                  <span className="text-sm font-medium ml-auto">{formatMinutesToHours(stats.dayMinutes || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-400">Evening</span>
                  <span className="text-sm font-medium ml-auto">{formatMinutesToHours(stats.eveningMinutes || 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-sm text-gray-400">Night</span>
                  <span className="text-sm font-medium ml-auto">{formatMinutesToHours(stats.nightMinutes || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <Link href="/admin/approvals">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data?.pendingApprovals?.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No pending approvals</p>
            ) : (
              <div className="space-y-2">
                {data?.pendingApprovals?.map((approval: any) => (
                  <div key={approval.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-light">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{approval.employeeName}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(approval.date), "MMM d")} - {formatMinutesToHours(approval.totalMinutes)}
                        {approval.isFullDay && <span className="ml-1 text-yellow-400">(Full Day)</span>}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-400 hover:bg-green-500/20"
                        onClick={() => approveMutation.mutate({ id: approval.id, status: "APPROVED" })}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:bg-red-500/20"
                        onClick={() => approveMutation.mutate({ id: approval.id, status: "REJECTED" })}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Employees & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Employees */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Employees (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topEmployees?.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {data?.topEmployees?.map((emp: any, index: number) => (
                  <div key={emp.id} className="flex items-center gap-3">
                    <span className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0 ? "bg-yellow-500/20 text-yellow-400" :
                      index === 1 ? "bg-gray-400/20 text-gray-400" :
                      index === 2 ? "bg-orange-600/20 text-orange-500" :
                      "bg-dark-400 text-gray-500"
                    )}>
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{emp.name}</span>
                    <span className="text-sm font-medium text-neon-cyan">{formatMinutesToHours(emp.totalMinutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Projects */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Projects (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.topProjects?.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No data</p>
            ) : (
              <div className="space-y-3">
                {data?.topProjects?.map((proj: any) => {
                  const percent = totalMonth > 0 ? (proj.totalMinutes / totalMonth) * 100 : 0;
                  return (
                    <div key={proj.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: proj.color }} />
                          <span className="text-sm truncate">{proj.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatMinutesToHours(proj.totalMinutes)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-dark-400 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percent}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: proj.color }}
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

      {/* Activity Feed & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentActivity?.length === 0 ? (
              <p className="text-gray-400 text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data?.recentActivity?.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan mt-2 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-gray-300 truncate">{getActivityText(log)}</p>
                      <p className="text-xs text-gray-500">{format(new Date(log.createdAt), "MMM d, HH:mm")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/admin/employees">
                <Button variant="ghost" className="w-full justify-start h-auto py-3">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </Link>
              <Link href="/admin/projects">
                <Button variant="ghost" className="w-full justify-start h-auto py-3">
                  <FolderKanban className="h-4 w-4 mr-2" />
                  Add Project
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button variant="ghost" className="w-full justify-start h-auto py-3">
                  <FileBarChart className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </Link>
              <Link href="/admin/approvals">
                <Button variant="ghost" className="w-full justify-start h-auto py-3">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  View Approvals
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Employee Dashboard Component (Original Calendar View)
function EmployeeDashboard() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["time-entries", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await fetch(
        `/api/time-entries?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const hoursPerDay = useMemo(() => {
    const map: Record<string, { total: number; day: number; evening: number; night: number }> = {};
    
    if (data?.entries) {
      for (const entry of data.entries) {
        for (const segment of entry.segments) {
          const dateKey = format(new Date(segment.date), "yyyy-MM-dd");
          if (!map[dateKey]) {
            map[dateKey] = { total: 0, day: 0, evening: 0, night: 0 };
          }
          map[dateKey].total += segment.durationMinutes;
          map[dateKey].day += segment.dayMinutes;
          map[dateKey].evening += segment.eveningMinutes;
          map[dateKey].night += segment.nightMinutes;
        }
      }
    }
    
    return map;
  }, [data]);

  const totals = useMemo(() => {
    const result = { total: 0, month: 0, day: 0, evening: 0, night: 0 };

    Object.entries(hoursPerDay).forEach(([dateStr, hours]) => {
      result.total += hours.total;
      result.month += hours.total;
      result.day += hours.day;
      result.evening += hours.evening;
      result.night += hours.night;
    });

    return result;
  }, [hoursPerDay]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setIsDrawerOpen(true);
  };

  const handleAddEntry = () => {
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="pl-12 md:pl-0">
          <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            Welcome back, {user?.firstName}! Here&apos;s your time overview.
          </p>
        </div>
        <Button onClick={handleAddEntry} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Time Entry
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card glow>
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-neon-cyan" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-400">Total Hours</p>
                  <p className="text-xl md:text-2xl font-bold">{formatMinutesToHours(totals.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card glow>
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-purple/5 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 md:h-6 md:w-6 text-neon-purple" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-400">This Month</p>
                  <p className="text-xl md:text-2xl font-bold">{formatMinutesToHours(totals.month)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-orange-500/20 to-orange-500/5 flex items-center justify-center flex-shrink-0">
                  <Sunset className="h-5 w-5 md:h-6 md:w-6 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-400">Evening Hours</p>
                  <p className="text-xl md:text-2xl font-bold">{formatMinutesToHours(totals.evening)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card>
            <CardContent className="p-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center flex-shrink-0">
                  <Moon className="h-5 w-5 md:h-6 md:w-6 text-indigo-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-gray-400">Night Hours</p>
                  <p className="text-xl md:text-2xl font-bold">{formatMinutesToHours(totals.night)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base md:text-lg">Calendar</CardTitle>
            <div className="flex items-center gap-1 md:gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm md:text-lg font-medium min-w-[100px] md:min-w-[150px] text-center">
                {format(currentMonth, "MMM yyyy")}
              </span>
              <Button variant="ghost" size="icon" className="h-8 w-8 md:h-10 md:w-10" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1 md:mb-2">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <div key={i} className="text-center text-xs md:text-sm font-medium text-gray-500 py-1 md:py-2">
                <span className="md:hidden">{day}</span>
                <span className="hidden md:inline">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 md:gap-1">
            {calendarDays.map((day, index) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const hours = hoursPerDay[dateKey];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.005 }}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "aspect-square p-1 md:p-2 rounded-md md:rounded-lg border transition-all duration-200 flex flex-col items-center justify-center",
                    isCurrentMonth ? "border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/5" : "border-transparent text-gray-600",
                    isSelected && "border-neon-cyan bg-neon-cyan/10",
                    today && "ring-1 md:ring-2 ring-neon-cyan/50"
                  )}
                >
                  <span className={cn("text-xs md:text-sm font-medium", today && "text-neon-cyan")}>
                    {format(day, "d")}
                  </span>
                  {hours && hours.total > 0 && (
                    <span className="text-[10px] md:text-xs text-neon-cyan font-medium">
                      {formatMinutesToHours(hours.total)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <DayDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} date={selectedDate} entries={data?.entries || []} onAddEntry={handleAddEntry} onRefetch={refetch} />
      <TimeEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} date={selectedDate} onSuccess={() => { refetch(); setIsModalOpen(false); }} />
    </div>
  );
}

// Main Dashboard - Role-based
export default function DashboardPage() {
  const { user } = useAuth();
  
  const isAdmin = user?.roles?.some((r: string) => r === "COMPANY_ADMIN" || r === "SUPER_ADMIN");

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return <EmployeeDashboard />;
}
