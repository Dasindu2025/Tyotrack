"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  Plus,
  Sun,
  Moon,
  Sunset,
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMinutesToHours } from "@/lib/utils";
import { TimeEntryModal } from "@/components/features/time-entry-modal";
import { DayDrawer } from "@/components/features/day-drawer";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardPage() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const startDate = startOfMonth(currentMonth);
  const endDate = endOfMonth(currentMonth);

  // Fetch time entries for the month
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

  // Calculate hours per day
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

  // Calculate totals
  const totals = useMemo(() => {
    const result = { week: 0, month: 0, day: 0, evening: 0, night: 0 };
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    Object.entries(hoursPerDay).forEach(([dateStr, hours]) => {
      const date = new Date(dateStr);
      result.month += hours.total;
      result.day += hours.day;
      result.evening += hours.evening;
      result.night += hours.night;
      
      if (date >= weekStart && date <= weekEnd) {
        result.week += hours.total;
      }
    });

    return result;
  }, [hoursPerDay]);

  // Calendar days
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Welcome back, {user?.firstName}! Here&apos;s your time overview.
          </p>
        </div>
        <Button onClick={handleAddEntry}>
          <Plus className="h-4 w-4" />
          Add Time Entry
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card glow>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-cyan/5 flex items-center justify-center">
                  <CalendarIcon className="h-6 w-6 text-neon-cyan" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">This Week</p>
                  <p className="text-2xl font-bold">{formatMinutesToHours(totals.week)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card glow>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-neon-purple/20 to-neon-purple/5 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-neon-purple" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">This Month</p>
                  <p className="text-2xl font-bold">{formatMinutesToHours(totals.month)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 flex items-center justify-center">
                  <Sun className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Day Hours</p>
                  <p className="text-2xl font-bold">{formatMinutesToHours(totals.day)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center">
                  <Moon className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Night Hours</p>
                  <p className="text-2xl font-bold">{formatMinutesToHours(totals.night + totals.evening)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendar</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-medium min-w-[150px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
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
                  transition={{ delay: index * 0.01 }}
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    "aspect-square p-2 rounded-lg border transition-all duration-200 flex flex-col items-center justify-center gap-1",
                    isCurrentMonth
                      ? "border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/5"
                      : "border-transparent text-gray-600",
                    isSelected && "border-neon-cyan bg-neon-cyan/10",
                    today && "ring-2 ring-neon-cyan/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      today && "text-neon-cyan"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {hours && hours.total > 0 && (
                    <span className="text-xs text-neon-cyan font-medium">
                      {formatMinutesToHours(hours.total)}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Drawer */}
      <DayDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        date={selectedDate}
        entries={data?.entries || []}
        onAddEntry={handleAddEntry}
        onRefetch={refetch}
      />

      {/* Time Entry Modal */}
      <TimeEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        date={selectedDate}
        onSuccess={() => {
          refetch();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}
