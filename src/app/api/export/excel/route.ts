import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  generateExcelExport,
  parseExportOptions,
} from "@/lib/export/excel-service";
import { canExportData } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canExportData(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const options = parseExportOptions(searchParams);
    const { buffer, filename } = await generateExcelExport(options);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
