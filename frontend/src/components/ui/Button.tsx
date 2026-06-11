import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const { onAnimationStart, ...restProps } = props as any;

  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-elevated disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white shadow-[0_4px_14px_-4px_rgba(5,150,105,0.4)] hover:bg-accent-light active:bg-accent-dark',
    secondary: 'bg-bg-elevated text-text-secondary border border-border-light hover:border-accent/50 hover:bg-bg-card active:bg-border',
    ghost: 'bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-elevated active:bg-border',
    danger: 'bg-status-error text-white shadow-[0_4px_14px_-4px_rgba(239,68,68,0.4)] hover:opacity-90 active:opacity-80',
  };

  const sizes = {
    sm: 'h-9 px-3 text-caption gap-1.5',
    md: 'h-11 px-4 text-body-sm gap-2',
    lg: 'h-12 px-6 text-body gap-2.5',
  };

  return (
    <motion.button
      whileTap={disabled || isLoading ? undefined : { scale: 0.98 }}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      {...restProps}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </motion.button>
  );
}