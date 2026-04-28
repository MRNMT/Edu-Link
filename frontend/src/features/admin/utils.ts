export const todayIso = new Date().toISOString().slice(0, 10);

export function downloadCsv(filename: string, rows: string[][]) {
  const escapeCell = (value: string) =>
    /[,"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const csv = rows.map((row) => row.map((cell) => escapeCell(cell ?? "")).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
