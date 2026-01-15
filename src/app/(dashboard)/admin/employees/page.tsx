"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Search, Edit, Mail, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { TableSkeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [backdateDays, setBackdateDays] = useState(7);

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
      toast.success("Employee updated!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (user: any) => {
    setEditUser(user);
    setBackdateDays(user.employeeProfile?.backdateLimitDays ?? 7);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: editUser.id,
      data: {
        employeeProfile: { backdateLimitDays: backdateDays },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-gray-400 mt-1">Manage employee profiles and backdate limits</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
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
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Employee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
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
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Employee"
      >
        {editUser && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-light border border-white/10">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-dark-600 font-bold">
                {editUser.firstName[0]}{editUser.lastName[0]}
              </div>
              <div>
                <p className="font-medium">{editUser.firstName} {editUser.lastName}</p>
                <p className="text-sm text-gray-400">{editUser.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Backdate Limit (days)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                How many days in the past can this employee create time entries
              </p>
              <Input
                type="number"
                min={0}
                max={365}
                value={backdateDays}
                onChange={(e) => setBackdateDays(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
