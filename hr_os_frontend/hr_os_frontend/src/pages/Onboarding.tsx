import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, FileText, Shield, Briefcase, PlayCircle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Employee, APIResponse } from "@/lib/types";

export default function Onboarding() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees-onboarding"],
    queryFn: async () => {
      const res = await api.get<Employee[]>("/employees/");
      return (res || []).filter((emp) => emp.status?.toLowerCase() === "onboarding");
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Onboarding</h1>
        <p className="text-muted-foreground">Monitor and manage the joining journey of new hires.</p>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Documents</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow><TableCell colSpan={5} className="text-center">Loading...</TableCell></TableRow>
            ) : employees?.length === 0 ? (
               <TableRow><TableCell colSpan={5} className="text-center">No active onboarding flows.</TableCell></TableRow>
            ) : (
              employees?.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">{emp.full_name}</TableCell>
                  <TableCell><code>{emp.employee_code}</code></TableCell>
                  <TableCell>
                    <Badge variant="secondary">{emp.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={emp.documents_uploaded ? "default" : "outline"}>
                      {emp.documents_uploaded ? "Uploaded" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/onboarding/${emp.id}`)}>
                      View Checklist
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
