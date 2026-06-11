import { cn } from '../../utils/helpers';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'interactive' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  onClick,
  style,
}: CardProps) {
  const base = 'rounded-2xl border transition-all duration-150';

  const variants = {
    default: 'bg-bg-card border-border',
    interactive: 'bg-bg-card border-border hover:border-accent/50 cursor-pointer active:bg-bg-elevated',
    elevated: 'bg-bg-elevated border-border shadow-elevated',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(base, variants[variant], paddings[padding], onClick && 'select-none', className)}
    >
      {children}
    </div>
  );
}