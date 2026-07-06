"use client";

import { ActionButton } from "@/components/ActionButton";
import { appendTimezoneParam } from "@/lib/datetime";
import { ExcelExportType } from "@/lib/export/excel-service";

interface ExportExcelButtonProps {
  exportType: ExcelExportType;
  params?: Record<string, string>;
  className?: string;
  size?: "md" | "lg" | "xl";
}

export function ExportExcelButton({
  exportType,
  params = {},
  className = "",
  size = "md",
}: ExportExcelButtonProps) {
  function handleExport() {
    const search = appendTimezoneParam(new URLSearchParams({ type: exportType }), undefined);

    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }

    window.open(`/api/export/excel?${search}`, "_blank");
  }

  return (
    <ActionButton
      variant="secondary"
      size={size}
      onClick={handleExport}
      className={className}
    >
      Export to Excel
    </ActionButton>
  );
}
