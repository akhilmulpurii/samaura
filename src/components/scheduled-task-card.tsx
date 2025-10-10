import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { TextShimmer } from "./motion-primitives/text-shimmer";
import { Badge } from "./ui/badge";

interface ScheduledTask {
  Name: string;
  State: string;
  CurrentProgressPercentage?: number;
  Id: string;
  Description: string;
  Category: string;
}

interface ScheduledTaskCardProps {
  task: ScheduledTask;
}

export function ScheduledTaskCard({ task }: ScheduledTaskCardProps) {
  const progress = task.CurrentProgressPercentage || 0;
  const isRunning = task.State === "Running";

  return (
    <Card className="mb-4 shadow-xl shadow-accent/50 dark:shadow-accent/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-md">{task.Name}</CardTitle>
        </div>
        <CardDescription>{task.Description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="gap-x-3 flex items-center">
          <Progress value={progress} className="w-full h-1.5" />
          <span className="font-medium text-xs text-muted-foreground font-mono">
            {progress.toFixed(1)}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
