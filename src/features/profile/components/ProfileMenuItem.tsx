import { ChevronRight } from "lucide-react";
import type { ComponentType } from "react";

interface ProfileMenuItemProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  showChevron?: boolean;
}

export function ProfileMenuItem({
  icon: Icon,
  label,
  onClick,
  variant = "default",
  showChevron = true,
}: ProfileMenuItemProps) {
  const iconColorClass = variant === "danger"
    ? "text-red-500"
    : "text-gray-400 dark:text-gray-500";
  const textColorClass = variant === "danger"
    ? "text-red-600"
    : "text-gray-900 dark:text-white";

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
    >
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${iconColorClass}`} />
        <span className={`font-medium ${textColorClass}`}>{label}</span>
      </div>
      {showChevron && <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600" />}
    </button>
  );
}
