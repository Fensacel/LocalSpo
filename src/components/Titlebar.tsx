import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Square, X, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { platformService } from '@/platform';

export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!platformService.isElectron || !window.electronAPI?.window) return;

    const checkMaximized = async () => {
      const maximized = await window.electronAPI.window.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();

    const interval = setInterval(checkMaximized, 500);
    return () => clearInterval(interval);
  }, []);

  const handleGoBack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(-1);
    }
  };

  const handleGoForward = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.history.forward();
  };

  if (!platformService.isElectron || !window.electronAPI?.window) {
    return null;
  }

  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <div className="drag-region h-11 hidden md:flex items-center justify-between px-4 bg-[#0B0B0D] border-b border-white/5 z-50 relative shrink-0 select-none">
      {/* Left: History Navigation */}
      <div className="flex items-center gap-2 no-drag" style={noDragStyle}>
        <div className="flex items-center gap-1 no-drag" style={noDragStyle}>
          <button
            type="button"
            onClick={handleGoBack}
            title="Go back"
            style={noDragStyle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all no-drag cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleGoForward}
            title="Go forward"
            style={noDragStyle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all no-drag cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Center Drag Region */}
      <div className="flex-1 h-full" />

      {/* Right: Window Controls */}
      <div className="flex items-center gap-1 no-drag" style={noDragStyle}>
        <TitlebarButton
          onClick={() => window.electronAPI.window.minimize()}
          hoverColor="hover:bg-white/10"
        >
          <Minus size={14} strokeWidth={1.8} />
        </TitlebarButton>

        <TitlebarButton
          onClick={() => {
            window.electronAPI.window.maximize();
            setIsMaximized(!isMaximized);
          }}
          hoverColor="hover:bg-white/10"
        >
          {isMaximized ? (
            <Copy size={11} strokeWidth={1.8} />
          ) : (
            <Square size={11} strokeWidth={1.8} />
          )}
        </TitlebarButton>

        <TitlebarButton
          onClick={() => window.electronAPI.window.close()}
          hoverColor="hover:bg-red-500/80 hover:text-white"
        >
          <X size={14} strokeWidth={1.8} />
        </TitlebarButton>
      </div>
    </div>
  );
}

interface TitlebarButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  hoverColor: string;
}

function TitlebarButton({ children, onClick, hoverColor }: TitlebarButtonProps) {
  const noDragStyle = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={noDragStyle}
      className={`w-9 h-8 flex items-center justify-center text-[#8B90A0] transition-colors duration-150 rounded-md no-drag cursor-pointer ${hoverColor}`}
    >
      {children}
    </motion.button>
  );
}
