import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import api from "@/lib/api";
import { Loader2, Copy, Check, Upload, User } from "lucide-react";

interface CreateEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateEmployeeModal({ open, onOpenChange }: CreateEmployeeModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("core");

  // Core Info states
  const [fullName, setFullName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("EMPLOYEE");
  const [employeeCode, setEmployeeCode] = useState("");
  const [designation, setDesignation] = useState("Staff");
  const [departmentId, setDepartmentId] = useState("none");
  const [dateOfJoining, setDateOfJoining] = useState("");

  // Work & Reporting states
  const [managerId, setManagerId] = useState("none");
  const [seatingLocation, setSeatingLocation] = useState("Noida");
  const [workPhone, setWorkPhone] = useState("");
  const [extension, setExtension] = useState("");
  const [tags, setTags] = useState("");

  // Personal states
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [gender, setGender] = useState("Male");
  const [nickName, setNickName] = useState("");
  const [otherEmail, setOtherEmail] = useState("");

  // Bio & Photo states
  const [avatarUrl, setAvatarUrl] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [expertise, setExpertise] = useState("");

  // Custom "Other" manual input states
  const [customDepartment, setCustomDepartment] = useState("");
  const [customRole, setCustomRole] = useState("");
  const [customMaritalStatus, setCustomMaritalStatus] = useState("");
  const [customGender, setCustomGender] = useState("");

  // Helper data states
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [successData, setSuccessData] = useState<{ password?: string; email?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch helper lists when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab("core");
      api.get<any>("/admin/departments").then(res => {
        const depts = Array.isArray(res) ? res : (res?.data || []);
        setDepartments(depts);
      }).catch(console.error);
      
      api.get<any>("/admin/roles").then(res => {
        const rList = Array.isArray(res) ? res : (res?.data || []);
        setRoles(rList);
      }).catch(console.error);

      api.get<any>("/employees/").then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setAllEmployees(res.data);
        } else if (Array.isArray(res)) {
          setAllEmployees(res);
        }
      }).catch(console.error);
    } else {
      // Reset all states
      setFullName("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("EMPLOYEE");
      setEmployeeCode("");
      setDesignation("Staff");
      setDepartmentId("none");
      setDateOfJoining("");
      setManagerId("none");
      setSeatingLocation("Noida");
      setWorkPhone("");
      setExtension("");
      setTags("");
      setPhone("");
      setBirthDate("");
      setMaritalStatus("Single");
      setGender("Male");
      setNickName("");
      setOtherEmail("");
      setAvatarUrl("");
      setAboutMe("");
      setExpertise("");
      setCustomDepartment("");
      setCustomRole("");
      setCustomMaritalStatus("");
      setCustomGender("");
      setSuccessData(null);
      setCopied(false);
    }
  }, [open]);

  // Handle avatar upload conversion to Base64
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsUploading(true);
    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Failed to read file");
    };
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
      setIsUploading(false);
      toast.success("Photo uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post<any>("/employees/", data);
      // api.post unwraps response.data.data automatically when response.data.success is true
      const payload = (res && (res.employee_id || res.id || res.user_id)) ? res : (res?.data || res);
      if (!payload || (!payload.employee_id && !payload.id && !payload.user_id)) {
        throw new Error(res?.error || res?.detail || "Failed to create employee");
      }
      return payload;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee created successfully!");
      setSuccessData({
        password: data.temp_password || data.password,
        email: email.trim()
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.response?.data?.error || err.message || "Failed to create employee";
      toast.error(msg);
    }
  });

  const handleSubmit = async () => {
    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail) {
      toast.error("Please fill in all required core fields (Full Name & Email)");
      setActiveTab("core");
      return;
    }
    
    try {
      let finalDeptId = departmentId !== "none" ? departmentId : undefined;
      if (departmentId === "other") {
        if (!customDepartment.trim()) {
          toast.error("Please type the custom department name");
          return;
        }
        const newDeptRes = await api.post<any>("/admin/departments", { name: customDepartment.trim() });
        finalDeptId = newDeptRes?.id || newDeptRes?._id;
      }

      const finalRole = role === "other" ? (customRole || "EMPLOYEE") : role;
      const finalMaritalStatus = maritalStatus === "other" ? (customMaritalStatus || "Single") : maritalStatus;
      const finalGender = gender === "other" ? (customGender || "Male") : gender;

      createMutation.mutate({
        full_name: cleanName,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: cleanEmail,
        role: finalRole,
        employee_code: employeeCode.trim() || undefined,
        designation: designation.trim() || "Staff",
        department_id: finalDeptId,
        date_of_joining: dateOfJoining || undefined,
        manager_id: managerId !== "none" ? managerId : undefined,
        seating_location: seatingLocation.trim() || "Noida",
        work_phone: workPhone.trim() || undefined,
        extension: extension.trim() || undefined,
        tags: tags.trim() || undefined,
        phone: phone.trim() || undefined,
        birth_date: birthDate || undefined,
        marital_status: finalMaritalStatus,
        gender: finalGender,
        nick_name: nickName.trim() || undefined,
        other_email: otherEmail.trim() || undefined,
        avatar_url: avatarUrl || undefined,
        about_me: aboutMe.trim() || undefined,
        expertise: expertise.trim() || undefined,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.message || "Failed to submit custom fields");
    }
  };

  const copyToClipboard = () => {
    if (successData?.password) {
      navigator.clipboard.writeText(successData.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Password copied to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (successData && val === false) return; // Force manual closing
      onOpenChange(val);
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {successData ? "Employee Created Successfully!" : "Add New Employee"}
          </DialogTitle>
          <DialogDescription className="text-slate-400 text-xs">
            {successData 
              ? "Share these login credentials securely with the employee."
              : "Instantly create a new employee, populate their directory metadata, and generate their login account."}
          </DialogDescription>
        </DialogHeader>

        {successData ? (
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs font-bold uppercase">Email Address</Label>
              <div className="px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 font-mono text-sm text-white">
                {successData.email}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-400 text-xs font-bold uppercase">Temporary Password</Label>
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-2.5 bg-white/5 rounded-xl border border-white/10 font-mono text-sm text-white tracking-widest flex items-center">
                  {successData.password}
                </div>
                <Button variant="outline" size="icon" onClick={copyToClipboard} className="shrink-0 rounded-xl border-white/10 hover:bg-white/10 text-white h-10 w-10">
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </Button>
              </div>
              <p className="text-xs text-amber-500 font-medium">
                Make sure to copy this password now. It will not be shown again.
              </p>
            </div>
            
            <div className="pt-4 flex justify-end">
              <Button onClick={() => onOpenChange(false)} className="rounded-xl px-6">Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-4 bg-slate-900/60 p-1 rounded-xl border border-white/5">
                <TabsTrigger value="core" className="text-xs py-2 rounded-lg font-bold data-[state=active]:bg-primary">Core Info</TabsTrigger>
                <TabsTrigger value="work" className="text-xs py-2 rounded-lg font-bold data-[state=active]:bg-primary">Work</TabsTrigger>
                <TabsTrigger value="personal" className="text-xs py-2 rounded-lg font-bold data-[state=active]:bg-primary">Personal</TabsTrigger>
                <TabsTrigger value="bio" className="text-xs py-2 rounded-lg font-bold data-[state=active]:bg-primary">Bio / Photo</TabsTrigger>
              </TabsList>

              {/* 1. CORE INFO */}
              <TabsContent value="core" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Full Name <span className="text-red-500">*</span></Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Jane Doe"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Email Address <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@company.com"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">First Name</Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Last Name</Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Employee ID</Label>
                    <Input
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="Auto-generated if blank"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Designation / Title</Label>
                    <Input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. SMM Specialist"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Department</Label>
                    <Select value={departmentId} onValueChange={setDepartmentId}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white">
                        <SelectValue placeholder="No Department" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10 text-white">
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map(d => (
                          <SelectItem key={d.id || d._id} value={d.id || d._id}>{d.name}</SelectItem>
                        ))}
                        <SelectItem value="other">Others (Fill Manually)</SelectItem>
                      </SelectContent>
                    </Select>
                    {departmentId === "other" && (
                      <Input
                        value={customDepartment}
                        onChange={(e) => setCustomDepartment(e.target.value)}
                        placeholder="Enter Custom Department Name"
                        className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary mt-1.5"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">System Role <span className="text-red-500">*</span></Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white">
                        <SelectValue placeholder="Select Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10 text-white">
                        {roles.map(r => (
                          <SelectItem key={r.role} value={r.role}>
                            {r.display_name || r.role}
                          </SelectItem>
                        ))}
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        <SelectItem value="other">Others (Fill Manually)</SelectItem>
                      </SelectContent>
                    </Select>
                    {role === "other" && (
                      <Input
                        value={customRole}
                        onChange={(e) => setCustomRole(e.target.value)}
                        placeholder="Enter Custom Role (e.g. CONSULTANT)"
                        className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary mt-1.5"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Date of Joining</Label>
                    <Input
                      type="date"
                      value={dateOfJoining}
                      onChange={(e) => setDateOfJoining(e.target.value)}
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-slate-300 focus:border-primary"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 2. WORK & REPORTING */}
              <TabsContent value="work" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Reporting To (Manager)</Label>
                    <Select value={managerId} onValueChange={setManagerId}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10 text-white max-h-60">
                        <SelectItem value="none">No Manager</SelectItem>
                        {allEmployees.map(emp => (
                          <SelectItem key={emp.id || emp._id} value={emp.id || emp._id}>
                            {emp.full_name} ({emp.employee_code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Work Location</Label>
                    <Input
                      value={seatingLocation}
                      onChange={(e) => setSeatingLocation(e.target.value)}
                      placeholder="e.g. Gurugram Office"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Work Phone</Label>
                    <Input
                      value={workPhone}
                      onChange={(e) => setWorkPhone(e.target.value)}
                      placeholder="e.g. +91 124 459800"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Extension</Label>
                    <Input
                      value={extension}
                      onChange={(e) => setExtension(e.target.value)}
                      placeholder="e.g. 102"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-300">Tags / Skills</Label>
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g. SMM, Design, EDI, Marketing (comma-separated)"
                    className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                  />
                </div>
              </TabsContent>

              {/* 3. PERSONAL */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Mobile Phone</Label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91-9876543210"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Birth Date</Label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-slate-300 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Marital Status</Label>
                    <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white">
                        <SelectValue placeholder="Single" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10 text-white">
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                        <SelectItem value="other">Others (Fill Manually)</SelectItem>
                      </SelectContent>
                    </Select>
                    {maritalStatus === "other" && (
                      <Input
                        value={customMaritalStatus}
                        onChange={(e) => setCustomMaritalStatus(e.target.value)}
                        placeholder="Enter Marital Status"
                        className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary mt-1.5"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Gender</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white">
                        <SelectValue placeholder="Male" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950 border-white/10 text-white">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="other">Others (Fill Manually)</SelectItem>
                      </SelectContent>
                    </Select>
                    {gender === "other" && (
                      <Input
                        value={customGender}
                        onChange={(e) => setCustomGender(e.target.value)}
                        placeholder="Enter Gender"
                        className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary mt-1.5"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Nick Name</Label>
                    <Input
                      value={nickName}
                      onChange={(e) => setNickName(e.target.value)}
                      placeholder="e.g. Bobby"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-300">Other / Personal Email</Label>
                    <Input
                      type="email"
                      value={otherEmail}
                      onChange={(e) => setOtherEmail(e.target.value)}
                      placeholder="personal.email@gmail.com"
                      className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* 4. BIO & PHOTO */}
              <TabsContent value="bio" className="space-y-4 mt-4">
                <div className="flex gap-6 items-center">
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label className="text-xs font-bold text-slate-300">Photo / Avatar Image</Label>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center justify-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 cursor-pointer transition-all">
                        <Upload className="w-4 h-4 text-slate-400" />
                        {isUploading ? "Uploading..." : "Select File"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                      {avatarUrl && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setAvatarUrl("")}
                          className="text-xs text-rose-500 hover:text-rose-400"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500">Supported formats: JPG, PNG. Max size 2MB.</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-300">About Me / Summary</Label>
                  <Textarea
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    placeholder="Short description of the employee's background..."
                    className="bg-white/5 border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:border-primary min-h-[80px]"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-300">Ask me about / Expertise</Label>
                  <Input
                    value={expertise}
                    onChange={(e) => setExpertise(e.target.value)}
                    placeholder="e.g. Billing inquiries, EDI mappings, Web development"
                    className="bg-white/5 border-white/10 rounded-xl h-10 text-xs text-white placeholder:text-slate-500 focus:border-primary"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-5 border-white/10 hover:bg-white/5 text-white">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createMutation.isPending || isUploading || !fullName || !email}
                className="rounded-xl px-6 bg-primary hover:bg-primary/95 text-white font-bold"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Employee
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
