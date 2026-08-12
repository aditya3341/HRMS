import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export default function OnboardingDetail() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  const [ndaAccepted, setNdaAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const { data: employees, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await api.get<any[]>("/employees/");
      return Array.isArray(res) ? res : [];
    },
  });

  const assignManagerMutation = useMutation({
    mutationFn: async (managerId: string) => {
      await api.patch(`/employees/${employeeId}`, {
        manager_id: managerId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", employeeId] });
      queryClient.refetchQueries({ queryKey: ["onboarding", employeeId] });
    }
  });

  // ================= UPLOAD MUTATION =================
  const uploadMutation = useMutation({
    mutationFn: async ({ file, docType }: { file: File; docType: string }) => {
      setUploadingDoc(docType);

      if (!employeeId) return;

      const formData = new FormData();
      formData.append("employee_id", employeeId);
      formData.append("file", file);
      formData.append("doc_type", docType);

      await api.post("/employee/docs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["onboarding", employeeId],
      });

      queryClient.refetchQueries({
        queryKey: ["onboarding", employeeId],
      });
    },
    onSettled: () => {
      setUploadingDoc(null);
    },
  });

  const acceptPolicyMutation = useMutation({
    mutationFn: async () => {
      await api.post("/policies/accept", {
        employee_id: employeeId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["onboarding", employeeId],
      });
      queryClient.refetchQueries({
        queryKey: ["onboarding", employeeId],
      });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/onboarding/${employeeId}/complete`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      navigate("/employees");
    },
  });

  const handleAssignManager = (managerId: string) => {
    if (!managerId) {
      setSelectedManager(null);
      return;
    }
    setSelectedManager(managerId);
    assignManagerMutation.mutate(managerId);
  };

  // ================= HANDLERS =================
  const handleUpload =
    (docType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        uploadMutation.mutate({
          file: e.target.files[0],
          docType,
        });
      }
    };

  // ================= FETCH =================
  const { data, isLoading } = useQuery({
    queryKey: ["onboarding", employeeId],
    queryFn: async () => {
      return await api.get<any>(`/onboarding/${employeeId}`);
    },
    enabled: !!employeeId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No onboarding data found</div>;

  // ================= DOCUMENT PROGRESS =================
  const documentSteps = [
    data.documents.pan,
    data.documents.aadhaar,
    data.documents.bank,
  ];

  const completedDocuments = documentSteps.filter(Boolean).length;

  const documentsCompleted = completedDocuments === 3;

  // ================= TOTAL PROGRESS =================
  const steps = [
    ...documentSteps,
    data.policies.completed,
    data.hr.completed,
    data.it.completed,
  ];

  const total = steps.length;
  const completed = steps.filter(Boolean).length;
  const percentage = Math.round((completed / total) * 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Onboarding Detail
        </h1>
        <p className="text-muted-foreground">
          Managing onboarding for employee ID:{" "}
          <span className="font-medium text-foreground">
            {employeeId}
          </span>
        </p>
      </div>

      {/* COMPLETE ONBOARDING BUTTON */}
      {data.status !== "COMPLETED" && (
        <div className="flex justify-end p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex flex-col items-end gap-2">
            {!data.can_activate && (
              <p className="text-xs text-amber-600 font-medium">
                Complete all tasks below to activate employee
              </p>
            )}
            <Button 
              size="lg"
              disabled={!data.can_activate || completeOnboardingMutation.isPending}
              onClick={() => {
                if (window.confirm("Are you sure you want to complete onboarding? This will make the employee ACTIVE and move them out of the onboarding queue.")) {
                  completeOnboardingMutation.mutate();
                }
              }}
              className={cn(
                "px-8 h-12 text-lg font-bold shadow-lg transition-all duration-300",
                data.can_activate ? "bg-green-600 hover:bg-green-700 hover:scale-105" : ""
              )}
            >
              {completeOnboardingMutation.isPending ? "Completing..." : "Complete Onboarding"}
            </Button>
          </div>
        </div>
      )}

      {/* PROGRESS BAR */}
      <div className="rounded-md border bg-card p-6">
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="font-medium text-foreground">
            Progress: {percentage}%
          </span>

          <span className="text-muted-foreground">
            {completed === total
              ? "All steps completed 🎉"
              : `${completed}/${total} completed`}
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
          <div
            className="h-full bg-green-500 transition-all duration-500 ease-in-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* STATUS SUMMARY */}
      <div className="rounded-md border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">
          Status: {data.status}
        </h2>

        <div className="space-y-2 text-sm">
          <div>
            Documents: {completedDocuments}/3 completed{" "}
            {documentsCompleted && (
              <span className="text-green-600 ml-2">
                All documents uploaded ✅
              </span>
            )}
          </div>

          <div>
            Policies:{" "}
            {data.policies.completed ? "Completed" : "Pending"}
          </div>

          <div>
            HR: {data.hr.completed ? "Completed" : "Pending"}
          </div>

          <div>
            IT: {data.it.completed ? "Completed" : "Pending"}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* DOCUMENTS */}
        <div className="rounded-md border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Documents
          </h2>

          <div className="flex flex-col gap-4">
            <DocumentRow
              label="PAN"
              uploaded={!!data.documents.pan}
              onUpload={handleUpload("pan")}
              loading={uploadingDoc === "pan"}
            />

            <DocumentRow
              label="Aadhaar"
              uploaded={!!data.documents.aadhaar}
              onUpload={handleUpload("aadhaar")}
              loading={uploadingDoc === "aadhaar"}
            />

            <DocumentRow
              label="Bank"
              uploaded={!!data.documents.bank}
              onUpload={handleUpload("bank")}
              loading={uploadingDoc === "bank"}
            />
          </div>
        </div>

        {/* POLICIES */}
        <div className="rounded-md border bg-card p-6">
          <h2 className="text-xl font-semibold mb-4">
            Policies
          </h2>
          
          {data.policies.completed ? (
            <div className="text-sm font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 p-4 rounded-md border border-green-200 dark:border-green-800 text-center">
              Policies Accepted ✅
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 p-4 bg-muted/20 border rounded-md">
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300"
                    checked={ndaAccepted}
                    onChange={(e) => setNdaAccepted(e.target.checked)}
                  />
                  I accept NDA
                </label>
                <label className="flex items-center gap-3 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="h-4 w-4 rounded border-gray-300"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  I accept Terms & Conditions
                </label>
              </div>

              <Button 
                onClick={() => acceptPolicyMutation.mutate()}
                disabled={!ndaAccepted || !termsAccepted || data.policies.completed || acceptPolicyMutation.isPending}
                className="w-full"
              >
                {acceptPolicyMutation.isPending ? "Saving..." : "Accept Policies"}
              </Button>
            </div>
          )}
        </div>

        {/* HR */}
        <div className="rounded-md border bg-card p-6 flex flex-col h-full">
          <h2 className="text-xl font-semibold mb-4">
            Assign Reporting Manager
          </h2>

          {data.hr.completed ? (
            <div className="flex flex-col items-center justify-center gap-2 p-6 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800 h-full">
              <span className="text-lg font-semibold">✅ Manager Assigned</span>
              {(selectedManager || data.manager_id || data.hr?.manager_id) && employees && (
                <span className="text-sm opacity-80 mt-1">
                  Manager: {
                    employees.find((emp: any) => 
                      emp.id === (selectedManager || data.manager_id || data.hr?.manager_id)
                    )?.full_name || "Unknown"
                  }
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col flex-1 space-y-4">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between focus:ring-1 focus:ring-primary"
                    disabled={assignManagerMutation.isPending || isLoadingEmployees}
                  >
                    {assignManagerMutation.isPending ? (
                      <span className="animate-pulse text-muted-foreground">Saving...</span>
                    ) : isLoadingEmployees ? (
                      <span className="animate-pulse text-muted-foreground">Loading managers...</span>
                    ) : selectedManager || data.manager_id || data.hr?.manager_id ? (
                      <span className="truncate">
                        {employees?.find((emp: any) => emp.id === (selectedManager || data.manager_id || data.hr?.manager_id))?.full_name || "Select Manager"}
                      </span>
                    ) : (
                      <span className="text-muted-foreground truncate">Select Manager</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search manager..." />
                    <CommandList className="max-h-[250px] overflow-y-auto custom-scrollbar">
                      <CommandEmpty>No employees found.</CommandEmpty>
                      <CommandGroup>
                        {employees
                          ?.filter((emp: any) => emp.id !== employeeId)
                          .map((emp: any) => {
                            const isSelected = (selectedManager || data.manager_id || data.hr?.manager_id) === emp.id;
                            const initials = emp.full_name
                              ? emp.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                              : "M";
                              
                            return (
                              <CommandItem
                                key={emp.id}
                                value={`${emp.full_name} ${emp.email}`}
                                onSelect={() => {
                                  handleAssignManager(emp.id);
                                  setOpen(false);
                                }}
                                className="flex items-center gap-3 cursor-pointer py-2 px-3 transition-colors hover:bg-muted"
                              >
                                <Avatar className="h-8 w-8 shrink-0">
                                  {emp.avatar_url && <AvatarImage src={emp.avatar_url} alt={emp.full_name} />}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                                    {initials}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col overflow-hidden">
                                  <span className="font-semibold text-sm leading-none truncate">
                                    {emp.full_name}
                                  </span>
                                  <span className="text-xs text-muted-foreground mt-1 truncate">
                                    {emp.email}
                                  </span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4 text-primary shrink-0 transition-opacity",
                                    isSelected ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* IT */}
        <div className="rounded-md border bg-card p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">
            IT Setup
          </h2>
          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-md border border-dashed">
            Asset allocation coming next
          </div>
        </div>
      </div>
    </div>
  );
}

// ================= COMPONENT =================
function DocumentRow({
  label,
  uploaded,
  onUpload,
  loading,
}: {
  label: string;
  uploaded: boolean;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
      <span className="font-medium text-sm">{label}</span>

      {uploaded ? (
        <span className="text-sm font-semibold text-green-600">
          Uploaded ✔
        </span>
      ) : (
        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-sm text-muted-foreground">
              Uploading...
            </span>
          ) : (
            <input type="file" className="text-sm" onChange={onUpload} />
          )}

          <span className="text-sm font-semibold text-yellow-600">
            Pending
          </span>
        </div>
      )}
    </div>
  );
}