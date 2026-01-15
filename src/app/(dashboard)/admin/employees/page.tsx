"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Edit, Mail, Calendar, Shield, MoreVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import toast from "react-hot-toast";

const approvalTypeLabels: Record<string, string> = {
  ALL_ENTRIES: "All Entries",
  FULL_DAY_ONLY: "Full Day Only",
  EDITS_ONLY: "Edits Only",
  NONE: "No Approval",
};

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backdateDays, setBackdateDays] = useState(7);
  const [approvalType, setApprovalType] = useState("NONE");

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Employee settings updated!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (user: any) => {
    setEditUser(user);
    setBackdateDays(user.employeeProfile?.backdateLimitDays ?? 7);
    setApprovalType(user.employeeProfile?.approvalType ?? "NONE");
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editUser.id,
      data: {
        employeeProfile: { 
          backdateLimitDays: backdateDays,
          approvalType: approvalType,
        },
      },
    });
  };

  const filteredUsers = data?.users?.filter((u: any) =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const statusColors = {
    ACTIVE: "success",
    INACTIVE: "error",
    SUSPENDED: "warning",
  } as const;

  const approvalColors: Record<string, string> = {
    ALL_ENTRIES: "text-red-400",
    FULL_DAY_ONLY: "text-orange-400",
    EDITS_ONLY: "text-yellow-400",
    NONE: "text-green-400",
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pl-12 md:pl-0">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Employees</h1>
          <p className="text-sm md:text-base text-gray-400 mt-1">
            Manage employee profiles, approval rules & backdate limits
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 md:pb-4">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Employee</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Department</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Approval Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Backdate Limit</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Last Login</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user: any, index: number) => (
                      <motion.tr
                        key={user.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-white/5 table-row-hover"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-dark-600 font-semibold text-sm">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {user.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-300">{user.employeeProfile?.department || "-"}</p>
                          <p className="text-xs text-gray-500">{user.employeeProfile?.position || ""}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={statusColors[user.status as keyof typeof statusColors]}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className={`flex items-center gap-2 ${approvalColors[user.employeeProfile?.approvalType || "NONE"]}`}>
                            <Shield className="h-4 w-4" />
                            <span className="text-sm">{approvalTypeLabels[user.employeeProfile?.approvalType || "NONE"]}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-neon-cyan">
                            <Calendar className="h-4 w-4" />
                            <span>{user.employeeProfile?.backdateLimitDays ?? 7} days</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400">
                          {user.lastLoginAt 
                            ? format(new Date(user.lastLoginAt), "MMM d, yyyy")
                            : "Never"
                          }
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map((user: any, index: number) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 rounded-lg border border-white/10 bg-surface-light"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-dark-600 font-semibold text-sm flex-shrink-0">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <Badge variant={statusColors[user.status as keyof typeof statusColors]} className="mt-1">
                          {user.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Approval</p>
                        <p className={`text-sm mt-1 ${approvalColors[user.employeeProfile?.approvalType || "NONE"]}`}>
                          {approvalTypeLabels[user.employeeProfile?.approvalType || "NONE"]}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Backdate</p>
                        <p className="text-neon-cyan text-sm mt-1">{user.employeeProfile?.backdateLimitDays ?? 7} days</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Last Login</p>
                        <p className="text-gray-400 text-sm mt-1">
                          {user.lastLoginAt 
                            ? format(new Date(user.lastLoginAt), "MMM d")
                            : "Never"
                          }
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Employee Settings"
      >
        {editUser && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-light border border-white/10">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-dark-600 font-bold flex-shrink-0">
                {editUser.firstName[0]}{editUser.lastName[0]}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{editUser.firstName} {editUser.lastName}</p>
                <p className="text-sm text-gray-400 truncate">{editUser.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Approval Type
              </label>
              <p className="text-xs text-gray-500 mb-2">
                When does this employee&apos;s time entries require approval?
              </p>
              <select
                value={approvalType}
                onChange={(e) => setApprovalType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-dark-400 border border-white/10 text-white focus:outline-none focus:border-neon-cyan/50"
              >
                <option value="NONE">No Approval Required</option>
                <option value="ALL_ENTRIES">All Entries</option>
                <option value="FULL_DAY_ONLY">Full Day Entries Only</option>
                <option value="EDITS_ONLY">Only When Editing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Backdate Limit (days)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                How many days in the past can this employee create time entries?
              </p>
              <Input
                type="number"
                min={0}
                max={365}
                value={backdateDays}
                onChange={(e) => setBackdateDays(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                isLoading={updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
