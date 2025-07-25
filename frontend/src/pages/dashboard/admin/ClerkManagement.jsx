import React, { useEffect, useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

const ClerkManagement = () => {
  const [clerks, setClerks] = useState([]);
  const BASE = import.meta.env.VITE_BACKEND_URL;

  const fetchClerks = async () => {
    try {
      const res = await fetch(`${BASE}/api/admin/clerks`);
      const data = await res.json();
      setClerks(data.clerks || []);
    } catch {
      toast.error("Failed to load clerks");
    }
  };

  useEffect(() => {
    fetchClerks();
  }, []);

  const toggle = async (id, action) => {
    try {
      await fetch(`${BASE}/api/admin/clerks/${id}/${action}`, {
        method: "PATCH",
      });
      setClerks((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, is_active: action === "activate" } : c
        )
      );
      toast.success(`Clerk ${action}d`);
    } catch {
      toast.error("Action failed");
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete clerk?")) return;
    try {
      await fetch(`${BASE}/api/admin/clerks/${id}`, { method: "DELETE" });
      setClerks((prev) => prev.filter((c) => c.id !== id));
      toast.success("Clerk deleted");
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clerk Management</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clerks.map((clerk) => (
            <TableRow key={clerk.id}>
              <TableCell>{clerk.name}</TableCell>
              <TableCell>{clerk.email}</TableCell>
              <TableCell>{clerk.is_active ? "Active" : "Inactive"}</TableCell>
              <TableCell className="flex gap-2">
                <Button
                  onClick={() =>
                    toggle(
                      clerk.id,
                      clerk.is_active ? "deactivate" : "activate"
                    )
                  }
                >
                  {clerk.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="destructive" onClick={() => remove(clerk.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClerkManagement;
