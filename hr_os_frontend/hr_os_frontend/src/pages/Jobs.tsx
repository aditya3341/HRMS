import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Job, APIResponse } from "@/lib/types";

import { JobTable } from "@/components/jobs/JobTable";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";

export default function Jobs() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const res = await api.get<Job[]>("/jobs/");
      return res || [];
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground">
            Manage your organization's job postings and hiring requirements.
          </p>
        </div>

        <CreateJobModal />
      </div>

      <JobTable 
        jobs={jobs} 
        isLoading={isLoading} 
        searchTerm={searchTerm} 
        onSearchChange={setSearchTerm} 
      />
    </div>
  );
}
