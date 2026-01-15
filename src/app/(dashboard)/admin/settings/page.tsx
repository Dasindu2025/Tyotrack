"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Save, Sun, Sunset, Moon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const [settings, setSettings] = useState({
    approvalType: "NONE",
    defaultBackdateDays: 7,
    standardWorkingHours: 8,
    autoLockAfterApproval: true,
  });

  const [workingHours, setWorkingHours] = useState([
    { name: "Day", startTime: "08:00", endTime: "18:00" },
    { name: "Evening", startTime: "18:00", endTime: "22:00" },
    { name: "Night", startTime: "22:00", endTime: "08:00" },
  ]);

  // Update local state when data loads
  useState(() => {
    if (data?.settings) {
      setSettings({
        approvalType: data.settings.approvalType || "NONE",
        defaultBackdateDays: data.settings.defaultBackdateDays || 7,
        standardWorkingHours: data.settings.standardWorkingHours || 8,
        autoLockAfterApproval: data.settings.autoLockAfterApproval ?? true,
      });
    }
    if (data?.workingHourRules) {
      setWorkingHours(
        data.workingHourRules.map((r: any) => ({
          id: r.id,
          name: r.name,
          startTime: r.startTime,
          endTime: r.endTime,
        }))
      );
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved!");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const saveWorkingHoursMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/settings/working-hours/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Working hours updated!");
    },
    onError: () => {
      toast.error("Failed to save working hours");
    },
  });

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Company Settings</h1>
        <p className="text-gray-400 mt-1">Configure working hours and approval rules</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure approval and backdate rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Approval Type
              </label>
              <Select
                value={settings.approvalType}
                onChange={(e) => setSettings({ ...settings, approvalType: e.target.value })}
                options={[
                  { value: "NONE", label: "No Approval Required" },
                  { value: "ALL_ENTRIES", label: "All Entries Require Approval" },
                  { value: "FULL_DAY_ONLY", label: "Full Day Entries Only" },
                  { value: "EDITS_ONLY", label: "Edits Require Approval" },
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Backdate Limit (days)
              </label>
              <Input
                type="number"
                min={0}
                max={365}
                value={settings.defaultBackdateDays}
                onChange={(e) => setSettings({ ...settings, defaultBackdateDays: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Standard Working Hours (per day)
              </label>
              <Input
                type="number"
                min={1}
                max={24}
                value={settings.standardWorkingHours}
                onChange={(e) => setSettings({ ...settings, standardWorkingHours: parseInt(e.target.value) || 8 })}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoLock"
                checked={settings.autoLockAfterApproval}
                onChange={(e) => setSettings({ ...settings, autoLockAfterApproval: e.target.checked })}
                className="rounded border-white/20 bg-surface text-neon-cyan"
              />
              <label htmlFor="autoLock" className="text-sm text-gray-300">
                Auto-lock entries after approval
              </label>
            </div>

            <Button
              onClick={handleSaveSettings}
              isLoading={saveSettingsMutation.isPending}
              className="w-full"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Working Hour Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Working Hour Rules
            </CardTitle>
            <CardDescription>
              Define time ranges for day, evening, and night hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : (
              data?.workingHourRules?.map((rule: any) => {
                const icons = {
                  Day: Sun,
                  Evening: Sunset,
                  Night: Moon,
                };
                const Icon = icons[rule.name as keyof typeof icons] || Clock;
                const colors = {
                  Day: "text-yellow-400",
                  Evening: "text-orange-400",
                  Night: "text-indigo-400",
                };
                const color = colors[rule.name as keyof typeof colors] || "text-gray-400";

                return (
                  <div
                    key={rule.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-surface-light border border-white/10"
                  >
                    <div className={`${color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-gray-400">
                        {rule.startTime} - {rule.endTime}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        defaultValue={rule.startTime}
                        className="w-28"
                        onChange={(e) => {
                          saveWorkingHoursMutation.mutate({
                            id: rule.id,
                            data: { startTime: e.target.value },
                          });
                        }}
                      />
                      <span className="text-gray-500">-</span>
                      <Input
                        type="time"
                        defaultValue={rule.endTime}
                        className="w-28"
                        onChange={(e) => {
                          saveWorkingHoursMutation.mutate({
                            id: rule.id,
                            data: { endTime: e.target.value },
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
