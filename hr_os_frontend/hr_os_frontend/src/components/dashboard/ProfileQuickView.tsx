import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  MapPin, 
  Briefcase, 
  ChevronRight,
  LayoutGrid,
  Camera,
  Loader2,
  Trash2,
  Download
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateSelfProfile } from "@/lib/employeeProfileApi";
import { exportEmployeeProfilePDF } from "@/lib/exportUtils";

interface ProfileQuickViewProps {
  user: any;
  profile: any;
}

export const ProfileQuickView: React.FC<ProfileQuickViewProps> = ({ user, profile }) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const firstName = (user?.email?.split('@')[0] || 'User')
    .split('.')[0]
    .charAt(0).toUpperCase() + (user?.email?.split('@')[0] || '').split('.')[0].slice(1);

  const displayAvatar = previewUrl || profile?.avatar_url || user?.avatar_url || "/zipaworld_logo_light.png";

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleResetAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering file input
    
    try {
        setIsUploading(true);
        await updateSelfProfile({ avatar_url: null } as any);
        setPreviewUrl(null);
        await refreshUser();
        await queryClient.invalidateQueries({ queryKey: ["dashboard-me"] });
        
        toast.success("Avatar reset to default");
    } catch (error) {
        console.error("Reset failed", error);
        toast.error("Failed to reset avatar");
    } finally {
        setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
    }

    try {
        setIsUploading(true);
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            
            // Set local preview immediately
            setPreviewUrl(base64String);
            
            try {
                await updateSelfProfile({ avatar_url: base64String } as any);
                
                // Refresh global auth session & dashboard
                await refreshUser();
                await queryClient.invalidateQueries({ queryKey: ["dashboard-me"] });
                
                toast.success("Profile picture updated!");
            } catch (error) {
                console.error("Upload failed", error);
                setPreviewUrl(null); // Reset on failure
                toast.error("Failed to update profile picture");
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
        
    } catch (error) {
        setIsUploading(false);
        setPreviewUrl(null);
        toast.error("Error processing file");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 backdrop-blur-md flex flex-col items-center text-center group hover:bg-white/[0.05] transition-all"
    >
      {/* 1. AVATAR */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-[2.5rem] blur-2xl group-hover:bg-primary/30 transition-all opacity-50" />
        
        <div 
            onClick={handleAvatarClick}
            className="cursor-pointer relative z-10 group/avatar"
        >
            <Avatar className="w-32 h-32 rounded-[2.5rem] border-2 border-primary/30 p-1 bg-slate-900 transition-transform group-hover/avatar:scale-105">
              <AvatarImage 
                src={displayAvatar} 
                className="rounded-[2.2rem] object-cover"
              />
              <AvatarFallback className="bg-slate-800 text-primary">
                <User size={40} />
              </AvatarFallback>
            </Avatar>

            {/* OVERLAY ICON */}
            <div className="absolute inset-0 bg-black/40 rounded-[2.2rem] flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity gap-3">
                {isUploading ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                    <>
                        <Camera className="w-8 h-8 text-white" />
                        {(previewUrl || profile?.avatar_url || user?.avatar_url) && (
                            <button 
                                onClick={handleResetAvatar}
                                className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-xl text-red-500 transition-colors"
                                title="Reset to default"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>

        <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*"
        />

        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-primary shadow-xl z-20">
           <LayoutGrid size={18} />
        </div>
      </div>

      {/* 2. NAME & ROLE */}
      <div className="mb-8">
        <h3 className="text-2xl font-black text-white tracking-tight mb-1">{firstName}</h3>
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{user?.role || "EMPLOYEE"}</p>
      </div>

      <div className="w-full h-px bg-white/5 mb-8" />

      {/* 3. DETAILS */}
      <div className="w-full space-y-6 mb-10">
        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 shrink-0 border border-white/5">
            <Briefcase size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-none mb-1">Department</p>
            <p className="text-sm font-bold text-slate-200 tracking-tight">
              {profile?.department?.name || "Unassigned"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-left">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 shrink-0 border border-white/5">
            <MapPin size={18} />
          </div>
          <div>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-none mb-1">Location</p>
            <p className="text-sm font-bold text-slate-200 tracking-tight">
              {profile?.location || "New Delhi, India"}
            </p>
          </div>
        </div>
      </div>

      {/* 4. ACTION */}
      <div className="flex gap-2">
        <button
          onClick={() => exportEmployeeProfilePDF(profile)}
          className="flex-1 py-3.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-2xl text-[11px] font-black text-indigo-400 uppercase tracking-wider transition-all flex items-center justify-center gap-2"
          title="Download Profile as PDF"
        >
          <Download size={14} />
          Download PDF
        </button>
        <button
          onClick={() => navigate(`/employees/${user?.employee_id || user?.user_id}`)}
          className="flex-1 py-3.5 bg-slate-900/50 hover:bg-slate-800 border border-white/5 rounded-2xl text-[11px] font-black text-white uppercase tracking-wider transition-all flex items-center justify-center gap-2 group/btn"
        >
          View Full Profile
          <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
};
