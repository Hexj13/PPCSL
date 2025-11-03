interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  text?: string;
  className?: string;
}

export function LoadingSpinner({ size = 'medium', text, className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };

  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  return (
    <div className={`text-center py-12 ${className}`}>
      <div
        className={`inline-block animate-spin rounded-full border-b-2 border-primary-600 ${sizeClasses[size]}`}
      ></div>
      {text && <p className={`mt-4 text-gray-300 ${textSizeClasses[size]}`}>{text}</p>}
    </div>
  );
}
