import { IframeEmbed } from "@/components/IframeEmbed";
import { ToolHeader } from "@/components/ToolHeader";

export default function ProctorTool() {
  return (
    <div className="flex flex-col h-full w-full">
      <ToolHeader title="🎯 Proctored Quiz" />
      <IframeEmbed 
        url="https://aiproctor.zipaworld.com/" 
        title="AI Proctor Tool" 
      />
    </div>
  );
}
