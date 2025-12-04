interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <div className="mt-6">
      <h3 className="px-4 pb-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        {title}
      </h3>
      <div className="bg-white dark:bg-gray-800">{children}</div>
    </div>
  );
}
