import {
  Briefcase,
  FileText,
  Mail,
  Clock,
  DollarSign,
  Laptop,
  HelpCircle,
} from "lucide-react";

type PlaceholderProps = {
  title: string;
  description: string;
  icon: React.ElementType;
};

function PlaceholderPage({ title, description, icon: Icon }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] animate-fade-in text-center space-y-4">
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}

export const JobsPage = () => (
  <PlaceholderPage
    title="Jobs"
    description="Create, manage, and track job postings across departments."
    icon={Briefcase}
  />
);

export const ApplicationsPage = () => (
  <PlaceholderPage
    title="Applications"
    description="Review candidate applications and move them through hiring stages."
    icon={FileText}
  />
);

export const OffersPage = () => (
  <PlaceholderPage
    title="Offers"
    description="Generate, approve, and send offer letters to selected candidates."
    icon={Mail}
  />
);

export const OnboardingPage = () => (
  <PlaceholderPage
    title="Onboarding"
    description="Manage onboarding tasks and employee joining workflows."
    icon={Clock}
  />
);

export const AttendancePage = () => (
  <PlaceholderPage
    title="Attendance"
    description="Track employee check-ins, check-outs, and attendance records."
    icon={Clock}
  />
);

export const PayrollPage = () => (
  <PlaceholderPage
    title="Payroll"
    description="Run payroll, generate payslips, and manage salary structures."
    icon={DollarSign}
  />
);

export const ITAssetsPage = () => (
  <PlaceholderPage
    title="IT Assets"
    description="Assign and manage laptops, devices, and IT inventory."
    icon={Laptop}
  />
);

export const ITTicketsPage = () => (
  <PlaceholderPage
    title="IT Tickets"
    description="Track and resolve employee IT support requests."
    icon={HelpCircle}
  />
);