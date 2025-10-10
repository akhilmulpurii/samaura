import { Loader } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader className="w-12 h-12 text-[var(--sidebar)] animate-spin" />
    </div>
  );
}
