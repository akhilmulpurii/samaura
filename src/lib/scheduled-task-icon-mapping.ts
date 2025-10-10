import {
  Volume2,
  Trash2,
  FolderOpen,
  FileText,
  HardDrive,
  Database,
  Scissors,
  Download,
  Subtitles,
  Image,
  Play,
  RefreshCw,
  Tv,
  Users,
  Search,
  FileX,
  Radio,
  PlugZap,
  Music,
  Film,
  BookOpen,
  Monitor,
  Merge,
  Settings,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  LoaderPinwheel,
} from "lucide-react";

// Icon mapping based on task names and categories
export const taskIconMapping: Record<string, React.ComponentType<any>> = {
  // Audio related
  "Audio Normalization": Volume2,
  "Download missing lyrics": Music,
  
  // Cleaning/Maintenance tasks
  "Clean Activity Log": FileText,
  "Clean Cache Directory": FolderOpen,
  "Clean Intro Skipper Cache": Scissors,
  "Clean Log Directory": FileText,
  "Clean Transcode Directory": HardDrive,
  "Clean up collections and playlists": Trash2,
  "Migrate Trickplay Image Location": Image,
  "Optimize database": Database,
  
  // Media analysis and detection
  "Detect and Analyze Media Segments": Scissors,
  "Media Segment Scan": Search,
  "Keyframe Extractor": Zap,
  
  // Download tasks
  "Download missing subtitles": Subtitles,
  
  // Image/Visual tasks
  "Extract Chapter Images": Image,
  "Generate Trickplay Images": Play,
  
  // Merge tasks
  "Merge All Episodes": Merge,
  "Merge All Movies": Merge,
  
  // Refresh/Update tasks
  "Refresh Guide": Tv,
  "Refresh People": Users,
  "Scan Media Library": RefreshCw,
  "Update Plugins": PlugZap,
  "TasksRefreshChannels": Radio,
  
  // Subtitle tasks
  "Subtitle Extract": Subtitles,
};

// Category-based fallback icons
export const categoryIconMapping: Record<string, React.ComponentType<any>> = {
  "Library": BookOpen,
  "Maintenance": Settings,
  "Intro Skipper": Scissors,
  "Live TV": Tv,
  "Internet Channels": Radio,
  "Application": Monitor,
  "Merge Versions": Merge,
};

// State-based icons
export const stateIconMapping: Record<string, React.ComponentType<any>> = {
  "Running": LoaderPinwheel,
  "Completed": CheckCircle,
  "Failed": AlertCircle,
  "Idle": Clock,
  "Cancelled": FileX,
};

// Get icon for a task based on name, category, and state
export function getTaskIcon(taskName: string, category: string, state: string): React.ComponentType<any> {
  // First try to match by exact task name
  if (taskIconMapping[taskName]) {
    return taskIconMapping[taskName];
  }
  
  // Then try to match by category
  if (categoryIconMapping[category]) {
    return categoryIconMapping[category];
  }
  
  // Finally fallback to state icon
  return stateIconMapping[state] || Clock;
}

// Get icon color based on state
export function getTaskIconColor(state: string): string {
  switch (state) {
    case "Running":
      return "text-blue-500";
    case "Completed":
      return "text-green-500";
    case "Failed":
      return "text-red-500";
    case "Cancelled":
      return "text-orange-500";
    case "Idle":
    default:
      return "text-gray-500";
  }
}

// Get icon with animation based on state
export function getTaskIconProps(state: string): { className: string } {
  const baseColor = getTaskIconColor(state);
  
  return {
    className: `w-4 h-4 ${baseColor}`
  };
}
