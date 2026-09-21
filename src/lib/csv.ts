export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function toCsv(rows: unknown[][]): string {
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
