interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, children, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8 ${className}`}>
      <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        {title}
      </h1>
      {children && (
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {children}
        </div>
      )}
    </div>
  );
}
