import { ArrowLeft } from 'lucide-react';

interface NavbarProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
}

export function Navbar({ showBack = false, onBack, title }: NavbarProps) {
  return (
    <header className="h-16 flex items-center mb-6">
      <div className="h-full flex items-center relative w-full">
        {showBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </button>
        )}

        {title && (
          <h1 className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-white tracking-wide uppercase">
            {title}
          </h1>
        )}
      </div>
    </header>
  );
}