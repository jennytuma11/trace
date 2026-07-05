import {
  CODE_BLUE_TYPE_ID,
  RAPID_RESPONSE_TYPE_ID,
} from "@/lib/mock-data";

interface CallTypeBadgeProps {
  callTypeId: string;
  callTypeName: string;
  size?: "sm" | "md" | "lg";
}

export function CallTypeBadge({
  callTypeId,
  callTypeName,
  size = "md",
}: CallTypeBadgeProps) {
  const isRapidResponse = callTypeId === RAPID_RESPONSE_TYPE_ID;
  const isCodeBlue = callTypeId === CODE_BLUE_TYPE_ID;

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  };

  const colorClasses = isRapidResponse
    ? "bg-rapid-response-bg text-rapid-response border-rapid-response/30"
    : isCodeBlue
      ? "bg-code-blue-bg text-code-blue border-code-blue/30"
      : "bg-background text-foreground border-border";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${sizeClasses[size]} ${colorClasses}`}
    >
      {callTypeName}
    </span>
  );
}

export function getCallTypeButtonClasses(callTypeId: string, selected: boolean) {
  if (callTypeId === RAPID_RESPONSE_TYPE_ID) {
    return selected
      ? "border-rapid-response bg-rapid-response-bg text-rapid-response ring-2 ring-rapid-response/20"
      : "border-border bg-white hover:border-rapid-response/40 hover:bg-rapid-response-bg/50";
  }
  if (callTypeId === CODE_BLUE_TYPE_ID) {
    return selected
      ? "border-code-blue bg-code-blue-bg text-code-blue ring-2 ring-code-blue/20"
      : "border-border bg-white hover:border-code-blue/40 hover:bg-code-blue-bg/50";
  }
  return selected
    ? "border-primary bg-teal-50 text-primary"
    : "border-border bg-white hover:bg-background";
}
