import {
  fetchScheduledTasks,
  getAuthData,
  fetchJellyfinLogs,
} from "../../actions/utils";
import { SearchBar } from "../../components/search-component";
import { BentoGrid, BentoItem } from "../../components/ui/bento-grid";
import { Badge } from "../../components/ui/badge";
import { LoaderPinwheel, FileText } from "lucide-react";
import {
  getTaskIcon,
  getTaskIconProps,
} from "../../lib/scheduled-task-icon-mapping";
import { AuroraBackground } from "../../components/aurora-background";
import { DataTable } from "../../components/logs/data-table";
import { logColumns } from "../../components/logs/columns";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LogFile } from "@jellyfin/sdk/lib/generated-client/models";

export default function DashboardPage() {
  const [scheduledTasks, setScheduledTasks] = useState<any[]>([]);
  const [logs, setLogs] = useState<LogFile[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const st = await fetchScheduledTasks();
        setScheduledTasks(st);
        const lg = await fetchJellyfinLogs();
        setLogs(lg);
      } catch (error: any) {
        console.error(error);
        if (error?.message?.includes("Authentication expired")) {
          // use React Router navigate
          navigate("/login");
        }
      }
    }

    fetchData();
  }, []);

  // Filter to show only running tasks
  const runningTasks = scheduledTasks.filter(
    (task) => task.State === "Running"
  );

  // Convert scheduled tasks to BentoGrid items
  const getTaskIconElement = (
    taskName: string,
    category: string,
    state: string
  ) => {
    const IconComponent = getTaskIcon(taskName, category, state);
    const iconProps = getTaskIconProps(state);
    return <IconComponent {...iconProps} />;
  };

  const getTaskStatus = (state: string) => {
    switch (state) {
      case "Running":
        return "Running";
      case "Completed":
        return "Completed";
      case "Failed":
        return "Failed";
      case "Idle":
        return "Idle";
      default:
        return "Active";
    }
  };

  const bentoItems: BentoItem[] = runningTasks.map((task, index) => ({
    title: task.Name,
    description: task.Description,
    icon: getTaskIconElement(task.Name, task.Category, task.State),
    status: getTaskStatus(task.State),
    tags: [task.Category],
    progress: task.CurrentProgressPercentage || 0,
    colSpan: index === 0 ? 2 : 1, // Make first item span 2 columns
    hasPersistentHover: task.State === "Running", // Highlight running tasks
  }));

  return (
    <div className="relative px-4 py-6 max-w-full overflow-hidden">
      {/* Main content with higher z-index */}
      <AuroraBackground colorStops={["#34d399", "#38bdf8", "#2dd4bf"]} />
      <div className="relative z-10">
        <div className="relative z-[9999] mb-8">
          <div className="mb-6">
            <SearchBar />
          </div>
        </div>
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-foreground mb-2 font-poppins">
            Dashboard
          </h2>
        </div>
        <div className="inline-flex items-center gap-3 mb-6">
          <h4 className="text-xl font-semibold text-foreground font-poppins">
            Scheduled Tasks
          </h4>
          <Badge variant={"secondary"}>
            <LoaderPinwheel className="animate-spin" />
            {`${runningTasks.length} Running`}
          </Badge>
        </div>
        {runningTasks.length > 0 ? (
          <BentoGrid items={bentoItems} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No running scheduled tasks
          </div>
        )}

        {/* Log Viewer Section */}
        <div className="mt-12">
          <div className="inline-flex items-center gap-3 mb-6">
            <h4 className="text-xl font-semibold text-foreground font-poppins">
              System Logs
            </h4>
            <Badge variant={"secondary"}>
              <FileText className="w-4 h-4" />
              {`${logs.length} Files`}
            </Badge>
          </div>
          <DataTable columns={logColumns} data={logs} />
        </div>
      </div>
    </div>
  );
}
