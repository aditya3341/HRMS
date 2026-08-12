import { IframeEmbed } from "@/components/IframeEmbed";
import { ToolHeader } from "@/components/ToolHeader";

export default function ResumeAnalyzer() {
  return (
    <div className="flex flex-col h-full w-full">
      <ToolHeader title="🧠 Resume Analyzer" />
      <IframeEmbed 
        url="https://airesume.zipaworld.com/" 
        title="AI Resume Analyzer" 
      />
    </div>
  );
}
