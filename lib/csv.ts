function sanitizeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Prevent spreadsheet formula injection
  if (/^[=+\-@\t\r]/.test(s)) {
    return `'${s}`;
  }
  return s;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(row.map((cell) => escapeCsv(sanitizeCell(cell))).join(","));
  }
  return lines.join("\n") + "\n";
}

export function csvHeaders(): string[] {
  return [
    "employee_code",
    "name",
    "attendance_day",
    "check_in_at",
    "check_out_at",
    "check_in_method",
    "check_out_method",
    "check_in_distance_m",
    "check_out_distance_m",
    "worked_minutes",
  ];
}

export function csvAttachmentFilename(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `attendance-${d}.csv`;
}
