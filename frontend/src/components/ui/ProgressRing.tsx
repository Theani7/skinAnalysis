import { motion } from 'framer-motion';
import { cn } from '../../utils/helpers';

interface ProgressRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export function ProgressRing({
  value,
  size = 100,
  strokeWidth = 6,
  color = '#059669',
  bgColor = '#374151',
  showValue = true,
  label,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgColor} strokeWidth={strokeWidth} opacity={0.3} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      {showValue && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ fontSize: size * 0.22, fontWeight: 700, color: '#f9fafb' }}
          >
            {Math.round(value)}%
          </motion.span>
          {label && (
            <span style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{label}</span>
          )}
        </div>
      )}
    </div>
  );
}