import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  fetchEmployeeProfile, 
  updateSelfProfile, 
  EmployeeProfile as IEmployeeProfile, 
  fetchEmployeeDocuments, 
  uploadEmployeeDocument, 
  deleteEmployeeDocument 
} from '../lib/employeeProfileApi';
import api from '../lib/api';
import {
  User, Mail, Briefcase, Building2, Calendar, Users,
  ChevronRight, ArrowLeft, AlertCircle, Edit2, Save, X, 
  Camera, Loader2, Trash2, Award, FileText, UserCheck, 
  File, FolderOpen, Download, Plus, Trash
} from 'lucide-react';
import { employeeApi } from '../lib/employeeApi';
import { exportEmployeeProfilePDF } from '../lib/exportUtils';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { toast } from 'sonner';

// ─── Helpers ───────────────────────────────────────────────────────────────
const getInitials = (name: string) =>
  name?.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

const statusColors: Record<string, string> = {
  active:      'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  onboarding:  'bg-amber-500/10  text-amber-500  border border-amber-500/20',
  inactive:    'bg-gray-500/10   text-gray-500   border border-gray-500/20',
  terminated:  'bg-red-500/10    text-red-500    border border-red-500/20',
};

// ─── Skeleton ───────────────────────────────────────────────────────────────
const ProfileSkeleton: React.FC = () => (
  <div className="animate-pulse space-y-4 p-6">
    <div className="h-52 rounded-3xl bg-gray-200 dark:bg-gray-800" />
    <div className="flex gap-4">
      <div className="w-64 h-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
      <div className="flex-1 h-80 rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  </div>
);

// ─── Tabs List ──────────────────────────────────────────────────────────────
const TABS = [
  'Basic Info', 
  'Work', 
  'Personal', 
  'Summary', 
  'Work experience', 
  'Education', 
  'Dependent', 
  'Documents', 
  'Related Forms'
] as const;

type Tab = (typeof TABS)[number];

const getTabIcon = (tab: Tab) => {
  switch (tab) {
    case 'Basic Info': return User;
    case 'Work': return Briefcase;
    case 'Personal': return UserCheck;
    case 'Summary': return FileText;
    case 'Work experience': return ActivityIcon;
    case 'Education': return Award;
    case 'Dependent': return Users;
    case 'Documents': return File;
    case 'Related Forms': return FolderOpen;
  }
};

const ActivityIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
);

// ─── Basic Info Tab ─────────────────────────────────────────────────────────
const BasicInfoTab: React.FC<{ 
  profile: IEmployeeProfile;
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
  isHRorAdmin: boolean;
}> = ({ profile, isEditing, editData, setEditData, isHRorAdmin }) => {
  const { basic } = profile;

  const getEditInput = (key: string, label: string) => (
    <input 
      type="text"
      value={editData[key] || ''}
      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
      className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary"
      placeholder={`Enter ${label}`}
    />
  );

  const rows = [
    { label: 'EmployeeID', key: 'employee_code', value: basic?.employee_code || '-', isEditable: isHRorAdmin, edit: getEditInput('employee_code', 'Employee ID') },
    { label: 'Email ID', key: 'email', value: basic?.email || '-', isEditable: isHRorAdmin, edit: getEditInput('email', 'Email ID') },
    { label: 'First Name', key: 'first_name', value: basic?.first_name || basic?.name || '-', isEditable: isHRorAdmin, edit: getEditInput('first_name', 'First Name') },
    { label: 'Nick Name', key: 'nick_name', value: basic?.nick_name || '-', isEditable: true, edit: getEditInput('nick_name', 'Nick Name') },
    { label: 'Last Name', key: 'last_name', value: basic?.last_name || '-', isEditable: isHRorAdmin, edit: getEditInput('last_name', 'Last Name') },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5 pb-4 border-b border-white/5">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{row.label}</span>
          {isEditing && row.isEditable ? (
            row.edit
          ) : (
            <p className="text-sm font-semibold text-white">{row.value}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Work Tab ───────────────────────────────────────────────────────────────
const WorkTab: React.FC<{ 
  profile: IEmployeeProfile; 
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
  departments: any[];
}> = ({ profile, isEditing, editData, setEditData, departments }) => {
  const { job, basic, reporting } = profile;

  const getEditInput = (key: string, label: string) => (
    <input 
      type="text"
      value={editData[key] || ''}
      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
      className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary"
      placeholder={`Enter ${label}`}
    />
  );

  const statusOptions = [
    { value: "ACTIVE", label: "Active" },
    { value: "ONBOARDING", label: "Onboarding" },
    { value: "INACTIVE", label: "Inactive" },
    { value: "TERMINATED", label: "Terminated" },
  ];

  const rows = [
    { 
      label: 'Department', 
      value: job?.department || 'Unassigned',
      edit: (
        <Select 
          value={editData.department_id || "none"} 
          onValueChange={(v) => setEditData({...editData, department_id: v})}
        >
          <SelectTrigger className="h-9 w-48 bg-slate-900/50 border-white/10 text-white">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="none">Unassigned</SelectItem>
            {departments?.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
    { label: 'Location', key: 'seating_location', value: job?.seating_location || 'Noida', edit: getEditInput('seating_location', 'Location') },
    { label: 'Reporting To', value: reporting?.manager ? `${reporting.manager.name} (${reporting.manager.id.substring(0, 8)})` : 'None' },
    { label: 'Title', key: 'designation', value: basic?.designation || 'Staff', edit: getEditInput('designation', 'Title') },
    { label: 'Source of hire', key: 'source_of_hire', value: job?.source_of_hire || 'Direct', edit: getEditInput('source_of_hire', 'Source of hire') },
    { label: 'Date of joining', value: formatDate(job?.date_of_joining) },
    { label: 'Seating Location', key: 'seating_location', value: job?.seating_location || 'Noida', edit: getEditInput('seating_location', 'Seating Location') },
    { 
      label: 'Employee status', 
      value: basic?.status || 'Unknown',
      edit: (
        <Select 
          value={editData.status} 
          onValueChange={(v) => setEditData({...editData, status: v})}
        >
          <SelectTrigger className="h-9 w-40 bg-slate-900/50 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            {statusOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      )
    },
    { label: 'Employee type', key: 'employee_type', value: job?.employee_type || 'Permanent', edit: getEditInput('employee_type', 'Employee type') },
    { label: 'Work phone', key: 'work_phone', value: job?.work_phone || '-', edit: getEditInput('work_phone', 'Work phone') },
    { label: 'Extension', key: 'extension', value: job?.extension || '-', edit: getEditInput('extension', 'Extension') },
    { label: 'Role', key: 'work_role', value: job?.work_role || 'Team member', edit: getEditInput('work_role', 'Role') },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5 pb-4 border-b border-white/5">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{row.label}</span>
          {isEditing && row.edit ? (
            row.edit
          ) : (
            <p className="text-sm font-semibold text-white">{row.value}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Personal Tab ───────────────────────────────────────────────────────────
const PersonalTab: React.FC<{ 
  profile: IEmployeeProfile;
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
  isHRorAdmin: boolean;
}> = ({ profile, isEditing, editData, setEditData, isHRorAdmin }) => {
  const { basic, personal } = profile;

  const getEditInput = (key: string, label: string) => (
    <input 
      type="text"
      value={editData[key] || ''}
      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
      className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary"
      placeholder={`Enter ${label}`}
    />
  );

  const rows = [
    { label: 'Mobile Phone', key: 'phone', value: basic?.phone || '-', edit: getEditInput('phone', 'Mobile Phone') },
    { label: 'Address 1', key: 'address', value: basic?.address || '-', edit: getEditInput('address', 'Address 1') },
    { label: 'PAN card number', key: 'pan', value: basic?.pan || '-', edit: isHRorAdmin ? getEditInput('pan', 'PAN card number') : null },
    { label: 'Aadhaar card number', key: 'aadhaar', value: basic?.aadhaar || '-', edit: isHRorAdmin ? getEditInput('aadhaar', 'Aadhaar card number') : null },
    { label: 'Other Email', key: 'other_email', value: personal?.other_email || '-', edit: getEditInput('other_email', 'Other Email') },
    { label: 'Birth Date', key: 'birth_date', value: personal?.birth_date || '-', edit: getEditInput('birth_date', 'Birth Date') },
    { label: 'Marital status', key: 'marital_status', value: personal?.marital_status || '-', edit: getEditInput('marital_status', 'Marital status') },
    { label: 'Bank Name', key: 'bank_name', value: personal?.bank_name || '-', edit: isHRorAdmin ? getEditInput('bank_name', 'Bank Name') : null },
    { label: 'Account Number', key: 'bank_account', value: basic?.bank_account || '-', edit: isHRorAdmin ? getEditInput('bank_account', 'Account Number') : null },
    { label: 'Account Type', key: 'account_type', value: personal?.account_type || '-', edit: isHRorAdmin ? getEditInput('account_type', 'Account Type') : null },
    { label: 'Bank Holder Name', key: 'bank_holder_name', value: personal?.bank_holder_name || '-', edit: isHRorAdmin ? getEditInput('bank_holder_name', 'Bank Holder Name') : null },
    { label: 'IFSC Code', key: 'ifsc_code', value: personal?.ifsc_code || '-', edit: isHRorAdmin ? getEditInput('ifsc_code', 'IFSC Code') : null },
    { label: 'Payment Mode', key: 'payment_mode', value: personal?.payment_mode || '-', edit: isHRorAdmin ? getEditInput('payment_mode', 'Payment Mode') : null },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5 pb-4 border-b border-white/5">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{row.label}</span>
          {isEditing && row.edit ? (
            row.edit
          ) : (
            <p className="text-sm font-semibold text-white">{row.value}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Summary Tab ────────────────────────────────────────────────────────────
const SummaryTab: React.FC<{ 
  profile: IEmployeeProfile;
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
}> = ({ profile, isEditing, editData, setEditData }) => {
  const { summary } = profile;

  const getEditInput = (key: string, label: string) => (
    <input 
      type="text"
      value={editData[key] || ''}
      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
      className="w-full max-w-sm px-3 py-1.5 text-sm rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary"
      placeholder={`Enter ${label}`}
    />
  );

  const rows = [
    { label: 'Job Description', key: 'job_description', value: summary?.job_description || '-', edit: getEditInput('job_description', 'Job Description') },
    { label: 'AboutMe', key: 'about_me', value: summary?.about_me || '-', edit: getEditInput('about_me', 'AboutMe') },
    { label: 'Ask me about/Expertise', key: 'expertise', value: summary?.expertise || '-', edit: getEditInput('expertise', 'Ask me about/Expertise') },
    { label: 'Gender', key: 'gender', value: summary?.gender || '-', edit: getEditInput('gender', 'Gender') },
    { label: 'Father\'s Name', key: 'fathers_name', value: summary?.fathers_name || '-', edit: getEditInput('fathers_name', 'Father\'s Name') },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1.5 pb-4 border-b border-white/5">
          <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider leading-none">{row.label}</span>
          {isEditing && row.edit ? (
            row.edit
          ) : (
            <p className="text-sm font-semibold text-white">{row.value}</p>
          )}
        </div>
      ))}
    </div>
  );
};

// ─── Work Experience Tab ────────────────────────────────────────────────────
const WorkExperienceTab: React.FC<{ 
  profile: IEmployeeProfile;
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
}> = ({ profile, isEditing, editData, setEditData }) => {
  const [newExp, setNewExp] = useState({ company_name: '', job_title: '', from_date: '', to_date: '', description: '' });
  const list = editData.work_experience || profile.work_experience || [];

  const handleAdd = () => {
    if (!newExp.company_name || !newExp.job_title) {
      toast.error("Company Name and Job Title are required");
      return;
    }
    const updated = [...list, newExp];
    setEditData({ ...editData, work_experience: updated });
    setNewExp({ company_name: '', job_title: '', from_date: '', to_date: '', description: '' });
  };

  const handleRemove = (idx: number) => {
    const updated = list.filter((_: any, i: number) => i !== idx);
    setEditData({ ...editData, work_experience: updated });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl space-y-6">
      <h3 className="text-sm font-bold text-white mb-2">Previous Experience</h3>
      
      {isEditing && (
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Company</span>
            <input type="text" value={newExp.company_name} onChange={(e) => setNewExp({...newExp, company_name: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="Company Name" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Job Title</span>
            <input type="text" value={newExp.job_title} onChange={(e) => setNewExp({...newExp, job_title: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="Job Title" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">From Date</span>
            <input type="text" value={newExp.from_date} onChange={(e) => setNewExp({...newExp, from_date: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. June 2024" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">To Date</span>
            <input type="text" value={newExp.to_date} onChange={(e) => setNewExp({...newExp, to_date: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. Present" />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Description</span>
              <input type="text" value={newExp.description} onChange={(e) => setNewExp({...newExp, description: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="Description" />
            </div>
            <Button size="icon" type="button" onClick={handleAdd} className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/95 text-white shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-bold bg-white/[0.02]">
              <th className="p-3">Previous Company Name</th>
              <th className="p-3">Job Title</th>
              <th className="p-3">From Date</th>
              <th className="p-3">To Date</th>
              <th className="p-3">Job Description</th>
              {isEditing && <th className="p-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((exp: any, i: number) => (
              <tr key={i} className="border-b border-white/5 text-slate-300 hover:bg-white/[0.01] transition-all">
                <td className="p-3 font-semibold">{exp.company_name}</td>
                <td className="p-3">{exp.job_title}</td>
                <td className="p-3">{exp.from_date}</td>
                <td className="p-3">{exp.to_date}</td>
                <td className="p-3 max-w-[200px] truncate">{exp.description}</td>
                {isEditing && (
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => handleRemove(i)} className="text-red-500 hover:text-red-400 transition-colors p-1"><Trash className="w-3.5 h-3.5" /></button>
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={isEditing ? 6 : 5} className="p-8 text-center text-slate-500 font-medium italic bg-white/[0.01]">
                  No rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Education Tab ──────────────────────────────────────────────────────────
const EducationTab: React.FC<{ 
  profile: IEmployeeProfile;
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
}> = ({ profile, isEditing, editData, setEditData }) => {
  const [newEdu, setNewEdu] = useState({ institute: '', degree: '', specialization: '', passing_year: '', gpa: '' });
  const list = editData.education || profile.education || [];

  const handleAdd = () => {
    if (!newEdu.institute || !newEdu.degree) {
      toast.error("Institute and Degree are required");
      return;
    }
    const updated = [...list, newEdu];
    setEditData({ ...editData, education: updated });
    setNewEdu({ institute: '', degree: '', specialization: '', passing_year: '', gpa: '' });
  };

  const handleRemove = (idx: number) => {
    const updated = list.filter((_: any, i: number) => i !== idx);
    setEditData({ ...editData, education: updated });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl space-y-6">
      <h3 className="text-sm font-bold text-white mb-2">Education Details</h3>
      
      {isEditing && (
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Institute</span>
            <input type="text" value={newEdu.institute} onChange={(e) => setNewEdu({...newEdu, institute: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. IIT Delhi" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Degree</span>
            <input type="text" value={newEdu.degree} onChange={(e) => setNewEdu({...newEdu, degree: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. B.Tech" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Specialization</span>
            <input type="text" value={newEdu.specialization} onChange={(e) => setNewEdu({...newEdu, specialization: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. CSE" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Passing Year</span>
            <input type="text" value={newEdu.passing_year} onChange={(e) => setNewEdu({...newEdu, passing_year: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. 2026" />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">GPA/Marks</span>
              <input type="text" value={newEdu.gpa} onChange={(e) => setNewEdu({...newEdu, gpa: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. 9.1" />
            </div>
            <Button size="icon" type="button" onClick={handleAdd} className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/95 text-white shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-bold bg-white/[0.02]">
              <th className="p-3">Institute Name</th>
              <th className="p-3">Degree/Course</th>
              <th className="p-3">Specialization</th>
              <th className="p-3">Passing Year</th>
              <th className="p-3">GPA/Marks</th>
              {isEditing && <th className="p-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((edu: any, i: number) => (
              <tr key={i} className="border-b border-white/5 text-slate-300 hover:bg-white/[0.01] transition-all">
                <td className="p-3 font-semibold">{edu.institute}</td>
                <td className="p-3">{edu.degree}</td>
                <td className="p-3">{edu.specialization}</td>
                <td className="p-3">{edu.passing_year}</td>
                <td className="p-3">{edu.gpa}</td>
                {isEditing && (
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => handleRemove(i)} className="text-red-500 hover:text-red-400 transition-colors p-1"><Trash className="w-3.5 h-3.5" /></button>
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={isEditing ? 6 : 5} className="p-8 text-center text-slate-500 font-medium italic bg-white/[0.01]">
                  No education records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Dependent Tab ──────────────────────────────────────────────────────────
const DependentTab: React.FC<{ 
  profile: IEmployeeProfile;
  isEditing: boolean;
  editData: any;
  setEditData: (data: any) => void;
}> = ({ profile, isEditing, editData, setEditData }) => {
  const [newDep, setNewDep] = useState({ name: '', relationship: '', age: '', dob: '' });
  const list = editData.dependents || profile.dependents || [];

  const handleAdd = () => {
    if (!newDep.name || !newDep.relationship) {
      toast.error("Name and Relationship are required");
      return;
    }
    const updated = [...list, newDep];
    setEditData({ ...editData, dependents: updated });
    setNewDep({ name: '', relationship: '', age: '', dob: '' });
  };

  const handleRemove = (idx: number) => {
    const updated = list.filter((_: any, i: number) => i !== idx);
    setEditData({ ...editData, dependents: updated });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl space-y-6">
      <h3 className="text-sm font-bold text-white mb-2">Dependents</h3>
      
      {isEditing && (
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Name</span>
            <input type="text" value={newDep.name} onChange={(e) => setNewDep({...newDep, name: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="Name" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Relationship</span>
            <input type="text" value={newDep.relationship} onChange={(e) => setNewDep({...newDep, relationship: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="e.g. Spouse, Child" />
          </div>
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Age</span>
            <input type="text" value={newDep.age} onChange={(e) => setNewDep({...newDep, age: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="Age" />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1 flex-1">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">Date of Birth</span>
              <input type="text" value={newDep.dob} onChange={(e) => setNewDep({...newDep, dob: e.target.value})} className="w-full px-3 py-1.5 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white" placeholder="DOB" />
            </div>
            <Button size="icon" type="button" onClick={handleAdd} className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/95 text-white shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 text-slate-400 font-bold bg-white/[0.02]">
              <th className="p-3">Name</th>
              <th className="p-3">Relationship</th>
              <th className="p-3">Age</th>
              <th className="p-3">Date of Birth</th>
              {isEditing && <th className="p-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {list.map((dep: any, i: number) => (
              <tr key={i} className="border-b border-white/5 text-slate-300 hover:bg-white/[0.01] transition-all">
                <td className="p-3 font-semibold">{dep.name}</td>
                <td className="p-3">{dep.relationship}</td>
                <td className="p-3">{dep.age}</td>
                <td className="p-3">{dep.dob}</td>
                {isEditing && (
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => handleRemove(i)} className="text-red-500 hover:text-red-400 transition-colors p-1"><Trash className="w-3.5 h-3.5" /></button>
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={isEditing ? 5 : 4} className="p-8 text-center text-slate-500 font-medium italic bg-white/[0.01]">
                  No dependents recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Documents Tab ──────────────────────────────────────────────────────────
const DocumentsTab: React.FC<{ 
  employeeId: string;
  isSelf: boolean;
  isAdmin: boolean;
}> = ({ employeeId }) => {
  const queryClient = useQueryClient();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("OTHER");
  const [docName, setDocName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["employeeDocs", employeeId],
    queryFn: () => fetchEmployeeDocuments(employeeId),
    enabled: !!employeeId,
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error("Please choose a file to upload");
      return;
    }
    if (uploadFile.type !== "application/pdf") {
      toast.error("Only PDF documents are allowed");
      return;
    }
    setIsUploading(true);
    try {
      await uploadEmployeeDocument(employeeId, docType, docName || uploadFile.name, uploadFile);
      toast.success("Document uploaded successfully");
      setUploadFile(null);
      setDocName("");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["employeeProfile", employeeId] });
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (docId: string, filename: string) => {
    try {
      const response = await api.get(`/employee-docs/${employeeId}/${docId}/download`, {
        responseType: "blob"
      });
      const blob = new Blob([response], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err) {
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteEmployeeDocument(employeeId, docId);
      toast.success("Document deleted");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["employeeProfile", employeeId] });
    } catch (err) {
      toast.error("Failed to delete document");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Form */}
      <form onSubmit={handleUpload} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Upload Document (PDF)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-semibold">Document Name</span>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. PAN Card, Experience Letter"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-semibold">Document Type</span>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ID_PROOF">ID Proof</option>
              <option value="ADDRESS_PROOF">Address Proof</option>
              <option value="EDUCATION">Education Certificates</option>
              <option value="EXPERIENCE">Experience Letter</option>
              <option value="PAYSLIP">Previous Payslip</option>
              <option value="OTHER">Other Documents</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-wider font-semibold">File (PDF only)</span>
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={isUploading || !uploadFile} className="px-6 rounded-xl font-bold bg-primary text-white hover:bg-primary/90">
            {isUploading ? "Uploading..." : "Upload Document"}
          </Button>
        </div>
      </form>

      {/* Uploaded Documents List */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <File className="w-4 h-4 text-primary" /> Uploaded Documents ({documents.length})
        </h3>
        
        {isLoading ? (
          <div className="text-center py-6 text-slate-500 italic">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 text-slate-500 italic">No documents uploaded yet. Only PDF files are supported.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-none mb-1">{doc.name}</p>
                    <p className="text-[9px] uppercase font-black text-slate-500 tracking-wider leading-none">{doc.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDownload(doc.id, doc.name)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    title="Download PDF"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                    title="Delete PDF"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Related Forms Tab ──────────────────────────────────────────────────────
const RelatedFormsTab: React.FC<{ profile: IEmployeeProfile }> = () => (
  <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-12 text-center shadow-xl">
    <p className="text-sm text-slate-500 italic">No related forms assigned to this employee.</p>
  </div>
);

// ─── Main Employee Profile Page ──────────────────────────────────────────────
const EmployeeProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAppStore();
  const { refreshUser } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>('Basic Info');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [personalEditData, setPersonalEditData] = useState<any>({});

  const isAdmin = ["super_admin", "hr_admin", "manager"].includes(user?.role?.toLowerCase() ?? "");
  const isHRorAdmin = ["super_admin", "hr_admin"].includes(user?.role?.toLowerCase() ?? "");
  const isSelf = user?.employeeId === id;

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['employeeProfile', id],
    queryFn: () => fetchEmployeeProfile(id!),
    enabled: !!id,
    staleTime: 60_000,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: employeeApi.getDepartments,
    enabled: isEditing && isAdmin,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const finalData = {
        ...data,
        manager_id: data.manager_id === "none" ? "" : data.manager_id,
        user_id: data.user_id === "none" ? "" : data.user_id,
        department_id: data.department_id === "none" ? "" : data.department_id,
      };
      return employeeApi.updateEmployee(id!, finalData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeProfile', id] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update profile");
    }
  });

  const personalMutation = useMutation({
    mutationFn: (data: any) => updateSelfProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeProfile', id] });
      toast.success("Personal details updated successfully");
      setIsEditingPersonal(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update details");
    }
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        if (isSelf) {
          await personalMutation.mutateAsync({ avatar_url: base64String });
        } else {
          await updateMutation.mutateAsync({ avatar_url: base64String });
        }
        await refreshUser();
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    try {
      if (isSelf) {
        await personalMutation.mutateAsync({ avatar_url: "" });
      } else {
        await updateMutation.mutateAsync({ avatar_url: "" });
      }
      await refreshUser();
      toast.success("Profile picture removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove profile picture");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!window.confirm("Are you sure you want to delete this employee? This action is permanent and will wipe out all user credentials, logs, and asset associations from everywhere.")) {
      return;
    }
    try {
      await api.delete(`/employees/${id}`);
      toast.success("Employee deleted successfully");
      navigate("/employees");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Failed to delete employee");
    }
  };

  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Banner image size must be less than 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => setIsUploading(true);
    reader.onerror = () => {
      setIsUploading(false);
      toast.error("Failed to read file");
    };
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        if (isSelf) {
          await personalMutation.mutateAsync({ banner_url: base64String });
        } else {
          await updateMutation.mutateAsync({ banner_url: base64String });
        }
        await refreshUser();
        toast.success("Profile banner updated successfully");
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = async () => {
    setIsUploading(true);
    try {
      if (isSelf) {
        await personalMutation.mutateAsync({ banner_url: "" });
      } else {
        await updateMutation.mutateAsync({ banner_url: "" });
      }
      await refreshUser();
      toast.success("Profile banner removed successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove profile banner");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Access Restricted</h3>
          <p className="text-sm text-slate-500">You do not have permission to view this employee's profile.</p>
          <button onClick={() => navigate(-1)} className="mt-4 text-sm text-primary hover:underline">← Go Back</button>
        </div>
      </div>
    );
  }

  const { basic, job } = profile;
  const statusClass = statusColors[basic.status.toLowerCase()] ?? statusColors.inactive;

  const handleStartEdit = () => {
    setEditData({
      status: basic.status,
      manager_id: profile.reporting.manager?.id || "none",
      user_id: basic.user_id || "none",
      department_id: profile.job.department_id || "none",
      designation: basic.designation,
      source_of_hire: job.source_of_hire,
      seating_location: job.seating_location,
      employee_type: job.employee_type,
      work_phone: job.work_phone,
      extension: job.extension,
      work_role: job.work_role,
      first_name: basic.first_name || basic.name || '',
      last_name: basic.last_name || '',
      nick_name: basic.nick_name || '',
      email: basic.email || '',
      employee_code: basic.employee_code || '',
    });
    setIsEditing(true);
  };

  const handleStartPersonalEdit = () => {
    setPersonalEditData({
      first_name: basic.first_name || basic.name || '',
      last_name: basic.last_name || '',
      nick_name: basic.nick_name || '',
      phone: basic.phone || '',
      address: basic.address || '',
      emergency_contact: basic.emergency_contact || '',
      pan: basic.pan || '',
      aadhaar: basic.aadhaar || '',
      bank_account: basic.bank_account || '',
      other_email: profile.personal?.other_email || '',
      birth_date: profile.personal?.birth_date || '',
      marital_status: profile.personal?.marital_status || 'Single',
      bank_name: profile.personal?.bank_name || '',
      account_type: profile.personal?.account_type || 'Savings',
      bank_holder_name: profile.personal?.bank_holder_name || '',
      ifsc_code: profile.personal?.ifsc_code || '',
      payment_mode: profile.personal?.payment_mode || 'Bank Transfer',
      job_description: profile.summary?.job_description || '',
      about_me: profile.summary?.about_me || '',
      expertise: profile.summary?.expertise || '',
      gender: profile.summary?.gender || 'Male',
      fathers_name: profile.summary?.fathers_name || '',
      work_experience: profile.work_experience || [],
      education: profile.education || [],
      dependents: profile.dependents || [],
    });
    setIsEditingPersonal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      <div className="px-4 md:px-6 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
        </button>
      </div>

      <div className="relative mx-4 md:mx-6 mt-4 overflow-hidden rounded-3xl border border-white/10 shadow-2xl min-h-[180px]">
        {basic?.banner_url ? (
          <img src={basic.banner_url} alt="Profile Banner" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <img src="/default_banner.jpg" alt="Profile Banner" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]" />
        <div className="absolute -top-16 -right-16 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {(isSelf || isAdmin) && (
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <button 
              onClick={() => bannerFileInputRef.current?.click()}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl shadow-lg border border-white/10 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-sm transition-all hover:scale-105"
              title="Change Banner Image"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Change Banner</span>
            </button>
            {basic?.banner_url && basic?.banner_url !== "/default_banner.jpg" && user?.role?.toUpperCase() === "SUPER_ADMIN" && (
              <button 
                onClick={handleRemoveBanner}
                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-xl shadow-lg border border-red-500/30 transition-all hover:scale-105"
                title="Remove Banner"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <input 
              type="file" 
              ref={bannerFileInputRef} 
              onChange={handleBannerUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        )}

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="relative group shrink-0">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="w-24 h-24 md:w-28 md:h-28 rounded-3xl bg-white/5 border border-white/20 flex items-center justify-center text-4xl font-black text-white shadow-2xl overflow-hidden shrink-0"
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              ) : basic?.avatar_url ? (
                <img 
                  src={basic.avatar_url} 
                  alt={basic.name} 
                  className={basic.avatar_url === "/zipaworld_logo_light.png" 
                    ? "w-full h-full object-contain p-2" 
                    : "w-full h-full object-cover"} 
                />
              ) : (
                getInitials(basic?.name || "??")
              )}
            </motion.div>
            {(isSelf || isAdmin) && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 p-2 bg-slate-900 text-white rounded-xl shadow-lg border border-white/10 hover:scale-105 active:scale-95 transition-all hover:bg-slate-800"
                  title="Upload Profile Picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                {basic?.avatar_url && user?.role?.toUpperCase() === "SUPER_ADMIN" && (
                  <button 
                    onClick={handleRemoveAvatar}
                    className="absolute -top-2 -right-2 p-2 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-xl shadow-lg border border-red-500/30 hover:scale-105 active:scale-95 transition-all"
                    title="Remove Profile Picture"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </>
            )}
          </div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editData.first_name || ''}
                        onChange={(e) => setEditData({
                          ...editData,
                          first_name: e.target.value,
                          full_name: (e.target.value + " " + (editData.last_name || "")).trim()
                        })}
                        className="px-2 py-1 text-sm bg-slate-900/50 border border-white/10 rounded-lg text-white font-bold w-28 md:w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="First Name"
                      />
                      <input
                        type="text"
                        value={editData.last_name || ''}
                        onChange={(e) => setEditData({
                          ...editData,
                          last_name: e.target.value,
                          full_name: ((editData.first_name || "") + " " + e.target.value).trim()
                        })}
                        className="px-2 py-1 text-sm bg-slate-900/50 border border-white/10 rounded-lg text-white font-bold w-28 md:w-36 focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Last Name"
                      />
                    </div>
                  ) : (
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{basic?.name || "Employee Profile"}</h1>
                  )}
                  {isEditing ? (
                    <Select 
                      value={editData.status} 
                      onValueChange={(v) => setEditData({...editData, status: v})}
                    >
                      <SelectTrigger className="h-8 w-28 bg-slate-900/50 border-white/10 text-white text-xs font-bold rounded-lg focus:outline-none focus:ring-1 focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusClass}`}>{basic?.status || "Unknown"}</span>
                  )}
                </div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.designation || ''}
                    onChange={(e) => setEditData({...editData, designation: e.target.value})}
                    className="px-2 py-1 text-xs bg-slate-900/50 border border-white/10 rounded-lg text-primary font-semibold w-48 mt-1 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Designation"
                  />
                ) : (
                  <p className="text-primary font-semibold text-base">{basic?.designation || "Employee"}</p>
                )}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-indigo-500/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 rounded-xl"
                  onClick={() => exportEmployeeProfilePDF(profile)}
                  title="Download Profile Data as PDF"
                >
                  <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>

                {isHRorAdmin && !isSelf && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 hover:text-red-400 rounded-xl"
                    onClick={handleDeleteEmployee}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Employee
                  </Button>
                )}

                {/* Save / Cancel buttons for admin edit fields */}
                {isHRorAdmin && (activeTab === 'Work' || activeTab === 'Basic Info') && (
                  isEditing ? (
                    <>
                      <Button variant="outline" size="sm" className="bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-xl" onClick={() => setIsEditing(false)}>
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      <Button variant="outline" size="sm" className="bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20 rounded-xl" onClick={() => updateMutation.mutate(editData)} disabled={updateMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" /> {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl" onClick={handleStartEdit}>
                      <Edit2 className="w-4 h-4 mr-2" /> {activeTab === 'Basic Info' ? 'Edit Basic Info' : 'Edit Job Info'}
                    </Button>
                  )
                )}

                {/* Save / Cancel buttons for self/personal edit fields */}
                {(isSelf || isAdmin) && (activeTab === 'Personal' || activeTab === 'Summary' || activeTab === 'Work experience' || activeTab === 'Education' || activeTab === 'Dependent') && (
                  isEditingPersonal ? (
                    <>
                      <Button variant="outline" size="sm" className="bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20 rounded-xl" onClick={() => setIsEditingPersonal(false)}>
                        <X className="w-4 h-4 mr-2" /> Cancel
                      </Button>
                      <Button variant="outline" size="sm" className="bg-green-500/10 border-green-500/30 text-green-500 hover:bg-green-500/20 rounded-xl" onClick={() => {
                        if (isSelf) personalMutation.mutate(personalEditData);
                        else updateMutation.mutate(personalEditData);
                      }} disabled={personalMutation.isPending || updateMutation.isPending}>
                        <Save className="w-4 h-4 mr-2" /> Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl" onClick={handleStartPersonalEdit}>
                      <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-3">
              {isEditing ? (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <Select 
                    value={editData.department_id || "none"} 
                    onValueChange={(v) => setEditData({...editData, department_id: v})}
                  >
                    <SelectTrigger className="h-8 w-32 bg-slate-900/50 border-white/10 text-white text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-primary">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="none">Unassigned</SelectItem>
                      {departments?.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{job.department}</span>
                </div>
              )}

              {isEditing ? (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="px-2 py-1 text-xs bg-slate-900/50 border border-white/10 rounded-lg text-white w-40 md:w-48 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Email ID"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[200px]">{basic.email}</span>
                </div>
              )}

              {isEditing ? (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={editData.employee_code || ''}
                    onChange={(e) => setEditData({...editData, employee_code: e.target.value})}
                    className="px-2 py-1 text-xs bg-slate-900/50 border border-white/10 rounded-lg text-white w-28 md:w-32 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Employee ID"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{basic.employee_code}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-4 md:mx-6 mt-6 flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Vertical Sidebar Navigation */}
        <div className="w-full lg:w-64 shrink-0 p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-1">
          {TABS.map(tab => {
            const Icon = getTabIcon(tab);
            return (
              <button key={tab} onClick={() => {
                setActiveTab(tab);
                setIsEditing(false);
                setIsEditingPersonal(false);
              }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all relative ${activeTab === tab ? 'text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                {activeTab === tab && <motion.div layoutId="vertical-pill" className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 -z-10" />}
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span className="relative z-10">{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Right Details Pane */}
        <div className="flex-grow w-full pb-16">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
              {activeTab === 'Basic Info' && <BasicInfoTab profile={profile} isEditing={isEditingPersonal} editData={personalEditData} setEditData={setPersonalEditData} isHRorAdmin={isHRorAdmin} />}
              {activeTab === 'Work'       && <WorkTab profile={profile} isEditing={isEditing} editData={editData} setEditData={setEditData} departments={departments || []} />}
              {activeTab === 'Personal'   && <PersonalTab profile={profile} isEditing={isEditingPersonal} editData={personalEditData} setEditData={setPersonalEditData} isHRorAdmin={isHRorAdmin} />}
              {activeTab === 'Summary'    && <SummaryTab profile={profile} isEditing={isEditingPersonal} editData={personalEditData} setEditData={setPersonalEditData} />}
              {activeTab === 'Work experience' && <WorkExperienceTab profile={profile} isEditing={isEditingPersonal} editData={personalEditData} setEditData={setPersonalEditData} />}
              {activeTab === 'Education'       && <EducationTab profile={profile} isEditing={isEditingPersonal} editData={personalEditData} setEditData={setPersonalEditData} />}
              {activeTab === 'Dependent'       && <DependentTab profile={profile} isEditing={isEditingPersonal} editData={personalEditData} setEditData={setPersonalEditData} />}
              {activeTab === 'Documents'       && <DocumentsTab employeeId={id!} isSelf={isSelf} isAdmin={isAdmin} />}
              {activeTab === 'Related Forms'   && <RelatedFormsTab profile={profile} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
