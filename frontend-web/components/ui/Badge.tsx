import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  rounded?: 'sm' | 'md' | 'full';
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  rounded = 'full',
}) => {
  const baseClasses = 'inline-flex items-center font-bold transition-colors duration-200';

  const variantClasses: Record<BadgeVariant, string> = {
    primary: 'bg-badge text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    error: 'bg-error/10 text-error',
    info: 'bg-blue-50 text-blue-600',
    neutral: 'bg-gray-100 text-secondary',
  };

  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const roundedClasses: Record<string, string> = {
    sm: 'rounded',
    md: 'rounded-md',
    full: 'rounded-full',
  };

  const classes = `
    ${baseClasses}
    ${variantClasses[variant]}
    ${sizeClasses[size]}
    ${roundedClasses[rounded]}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return <span className={classes}>{children}</span>;
};

export default Badge;
