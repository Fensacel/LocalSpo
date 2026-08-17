import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus, Square, X, Copy, ChevronLeft, ChevronRight, Download, MessageSquare, Radio } from 'lucide-react';
import { motion } from 'framer-motion';
import { platformService } from '@/platform';
import { ProfileDropdown } from '@/components/ProfileDropdown';
import { UniversalSearchBar } from '@/components/UniversalSearchBar';
import { ImportPlaylistModal } from '@/components/ImportPlaylistModal';
import { SocialChatDrawer } from '@/components/SocialChatDrawer';
import { JamModal } from '@/components/JamModal';
import { useChatStore } from '@/stores/useChatStore';
import { useJamStore } from '@/stores/useJamStore';

export function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);
  const [showJamModal, setShowJamModal] = useState(false);
  const { jamCode } = useJamStore();
  const { hasUnread, clearUnread } = useChatStore();
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
    <>
      <div className="drag-region h-11 hidden md:flex items-center justify-between px-4 bg-[#0B0B0D] border-b border-white/5 z-50 relative shrink-0 select-none">
        {/* Left: History Navigation */}
        <div className="flex items-center gap-1 shrink-0" style={noDragStyle}>
          <button
            type="button"
            onClick={handleGoBack}
            title="Go back"
            style={noDragStyle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={handleGoForward}
            title="Go forward"
            style={noDragStyle}
            className="w-7 h-7 rounded-md flex items-center justify-center text-[#9CA3AF] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Center: Universal Search Bar */}
        <div className="flex-1 flex justify-center px-4">
          <UniversalSearchBar />
        </div>

        {/* Right: Import Playlist + Profile Dropdown + Window Controls */}
        <div className="flex items-center gap-2 shrink-0" style={noDragStyle}>
          <button
            type="button"
            onClick={() => setShowJamModal(true)}
            title={jamCode ? `Listening Jam Active (${jamCode})` : 'Start or Join Listening Jam'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer relative ${
              jamCode
                ? 'bg-[#0070F3] text-white border-[#0070F3] shadow-glow'
                : 'bg-white/5 hover:bg-[#0070F3] text-[#9CA3AF] hover:text-white border-white/10 hover:border-transparent'
            }`}
          >
            <Radio size={13} className={jamCode ? 'animate-pulse' : ''} />
            <span className="hidden xl:inline">{jamCode ? `Jam (${jamCode})` : 'Listening Jam'}</span>
            {jamCode && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute -top-0.5 -right-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#0070F3] text-xs font-semibold text-white border border-white/10 hover:border-transparent transition-all cursor-pointer"
          >
            <Download size={13} />
            <span className="hidden xl:inline">Import Playlist</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearUnread();
              setShowChatDrawer(true);
            }}
            title="Social Chat"
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#0070F3] text-[#9CA3AF] hover:text-white flex items-center justify-center border border-white/10 transition-all cursor-pointer relative"
          >
            <MessageSquare size={14} />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/80 border border-[#0B0B0D]" />
            )}
          </button>

          <ProfileDropdown />

          <div className="w-px h-5 bg-white/10 mx-1" />

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

      {/* Import Playlist Modal */}
      <ImportPlaylistModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />

      {/* Social Chat Drawer */}
      <SocialChatDrawer isOpen={showChatDrawer} onClose={() => setShowChatDrawer(false)} />

      {/* Listening Jam Modal */}
      <JamModal isOpen={showJamModal} onClose={() => setShowJamModal(false)} />
    </>
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
      className={`w-9 h-8 flex items-center justify-center text-[#8B90A0] transition-colors duration-150 rounded-md cursor-pointer ${hoverColor}`}
    >
      {children}
    </motion.button>
  );
}
