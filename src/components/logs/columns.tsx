"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Eye, Download } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { Badge } from "../../components/ui/badge";
import { LogViewerDialog } from "./log-viewer-dialog";
import { LogFile } from "@jellyfin/sdk/lib/generated-client/models";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

// Wrapper component to manage dialog state for both name and actions
function LogRowWrapper({
  log,
  children,
}: {
  log: LogFile;
  children: (onViewLog: () => void) => React.ReactNode;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewLog = () => {
    setDialogOpen(true);
  };

  return (
    <>
      {children(handleViewLog)}
      <LogViewerDialog log={log} open={dialogOpen} onOpenChange={setDialogOpen}>
        <div />
      </LogViewerDialog>
    </>
  );
}

// Actions cell component
function LogActionsCell({
  log,
  onViewLog,
}: {
  log: LogFile;
  onViewLog: () => void;
}) {
  const { serverUrl, user } = useAuth();
  const accessToken = user?.AccessToken;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* <DropdownMenuLabel>Actions</DropdownMenuLabel> */}
          <DropdownMenuItem
            onClick={() => navigator.clipboard.writeText(log.Name!)}
          >
            Copy log name
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onViewLog}>
            <Eye className="h-4 w-4" />
            View log
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={async () => {
              try {
                const url = `${serverUrl}/System/Logs/Log?name=${log.Name}&api_key=${accessToken}`;
                const a = document.createElement("a");
                a.href = url;
                a.download = log.Name!;
                a.click();
              } catch (error) {
                console.error("Failed to download log:", error);
              }
            }}
          >
            <Download className="h-4 w-4" />
            Download log
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export const logColumns: ColumnDef<LogFile>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "Name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Log Name
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.getValue("Name") as string;
      const isFFmpegLog = name.startsWith("FFmpeg");
      const isMainLog = name.startsWith("log_");
      const log = row.original;

      return (
        <LogRowWrapper log={log}>
          {(onViewLog) => (
            <div className="flex items-center gap-2 ml-2">
              <button
                onClick={onViewLog}
                className="font-medium hover:underline cursor-pointer text-left"
              >
                {name}
              </button>
              {isFFmpegLog && (
                <Badge variant="secondary" className="text-xs">
                  FFmpeg
                </Badge>
              )}
              {isMainLog && (
                <Badge variant="default" className="text-xs">
                  System
                </Badge>
              )}
            </div>
          )}
        </LogRowWrapper>
      );
    },
  },
  {
    accessorKey: "Size",
    header: ({ column }) => {
      return (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Size
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const size = row.getValue("Size") as number;
      const formatted = formatFileSize(size);
      return <div className="text-center font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: "DateCreated",
    header: ({ column }) => {
      return (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("DateCreated") as string);
      return <div className="text-sm">{date.toLocaleString()}</div>;
    },
  },
  {
    accessorKey: "DateModified",
    header: ({ column }) => {
      return (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Modified
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("DateModified") as string);
      return <div className="text-sm">{date.toLocaleString()}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const log = row.original;
      return (
        <LogRowWrapper log={log}>
          {(onViewLog) => <LogActionsCell log={log} onViewLog={onViewLog} />}
        </LogRowWrapper>
      );
    },
  },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
