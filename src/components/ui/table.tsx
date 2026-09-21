"use client"

import * as React from "react"
import { Download } from "lucide-react"

import { cn } from "@/lib/utils"

type TableProps = React.ComponentProps<"table"> & {
  exportFileName?: string
  hideExport?: boolean
}

function csvCell(value: string): string {
  let text = value.replace(/\s+/g, " ").trim()
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = "'" + text
  return '"' + text.replace(/"/g, '""') + '"'
}

function downloadTableCsv(table: HTMLTableElement, fileName: string) {
  const rows = Array.from(table.querySelectorAll("tr"))
    .map((row) =>
      Array.from(row.querySelectorAll("th,td"))
        .filter((cell) => !cell.hasAttribute("data-export-ignore"))
        .map((cell) => csvCell(cell.textContent || ""))
        .join(","),
    )
    .filter(Boolean)

  const blob = new Blob(["\uFEFF" + rows.join("\r\n") + "\r\n"], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName.endsWith(".csv") ? fileName : fileName + ".csv"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function Table({ className, exportFileName = "lightworld-table", hideExport = false, ...props }: TableProps) {
  const tableRef = React.useRef<HTMLTableElement>(null)

  return (
    <div data-slot="table-block" className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/60 bg-card">
      {!hideExport && (
        <div className="flex items-center justify-end border-b border-border/50 bg-muted/20 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              if (tableRef.current) {
                downloadTableCsv(
                  tableRef.current,
                  exportFileName + "-" + new Date().toISOString().slice(0, 10),
                )
              }
            }}
            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-muted-foreground transition hover:border-amber-300 hover:text-foreground hover:shadow-sm"
            aria-label="Export table to CSV"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>
      )}
      <div
        data-slot="table-container"
        className="relative w-full max-w-full overflow-x-auto overscroll-x-contain"
      >
        <table
          ref={tableRef}
          data-slot="table"
          className={cn("w-full caption-bottom text-sm", className)}
          {...props}
        />
      </div>
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-muted/35 [&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "hover:bg-amber-50/45 dark:hover:bg-amber-950/10 data-[state=selected]:bg-muted border-b border-border/50 transition-colors",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-muted-foreground h-11 px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-4 py-3 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
