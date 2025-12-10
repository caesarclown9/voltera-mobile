import { User } from "lucide-react";

interface ProfileHeaderProps {
  name: string;
  phone?: string;
}

export function ProfileHeader({ name, phone }: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
        <User className="w-8 h-8 text-primary-500 dark:text-primary-400" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {name}
        </h2>
        {phone && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{phone}</p>
        )}
      </div>
    </div>
  );
}
