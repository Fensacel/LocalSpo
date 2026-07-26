import { motion } from 'framer-motion';
import {
  Mic2,
  Music,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Download,
  Tag,
  Sliders,
  Timer,
  Radio,
} from 'lucide-react';

export function DocsPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
          <Sparkles size={14} />
          <span>Localspo Official Documentation & User Guide</span>
        </div>
        <h1 className="text-4xl font-extrabold text-text tracking-tight">Features & Documentation</h1>
        <p className="text-base text-text/50 max-w-2xl">
          Discover all native capabilities built into Localspo — from ad-free online streaming to Spotify downloading, ID3 tag editing, and synced karaoke lyrics.
        </p>
      </motion.div>

      {/* Primary Native Tools */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2 text-xl font-bold text-text">
          <Sliders size={22} className="text-primary" />
          <span>Native Integrated Tools</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ad-Free Online Streaming */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 hover:border-primary/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Radio size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text">Ad-Free Online Streaming</h3>
              <p className="text-xs text-text/40 mt-0.5">Instant playback without downloading</p>
            </div>
            <p className="text-sm text-text/60 leading-relaxed">
              Stream any song directly from search results instantly without downloading local files. Enjoy 100% ad-free online music playback powered by background stream URL resolution.
            </p>
            <ul className="space-y-2 text-xs text-text/70 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                <span><strong>No Download Needed:</strong> Play online tracks immediately with zero storage overhead.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                <span><strong>100% Ad-Free:</strong> Continuous playback without commercial interruptions or pop-up ads.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                <span><strong>Smart Prefetching:</strong> Automatically pre-resolves upcoming queue tracks for gapless listening.</span>
              </li>
            </ul>
          </div>

          {/* Native Spotify Downloader */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 hover:border-primary/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Download size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text">Native Spotify Downloader</h3>
              <p className="text-xs text-text/40 mt-0.5">Built-in directly inside Localspo</p>
            </div>
            <p className="text-sm text-text/60 leading-relaxed">
              Easily download tracks, albums, or entire playlists directly from Spotify URLs. Everything is processed natively without launching external windows or background tools.
            </p>
            <ul className="space-y-2 text-xs text-text/70 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span><strong>Official Spotify Cover Art:</strong> Automatically fetches and embeds 1:1 HD album artwork.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span><strong>Auto Lyrics Embedding:</strong> Fetches synced LRC lyrics online and embeds them directly into audio tags.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span><strong>Multiple Audio Formats:</strong> Download in FLAC, MP3 (320kbps), M4A, or WAV.</span>
              </li>
            </ul>
          </div>

          {/* Native ID3 & Lyric Editor */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 hover:border-primary/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Tag size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text">Track Info & Metadata Editor</h3>
              <p className="text-xs text-text/40 mt-0.5">Right-click any song in your library</p>
            </div>
            <p className="text-sm text-text/60 leading-relaxed">
              Customize metadata, update cover images, or embed synced lyrics for any song in your library via the context menu.
            </p>
            <ul className="space-y-2 text-xs text-text/70 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                <span><strong>ID3 & FLAC Tag Editing:</strong> Edit Title, Artist, Album, Year, Genre, and Album Artist.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                <span><strong>Custom Artwork:</strong> Upload custom high-res cover art or remove existing covers.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                <span><strong>Embedded Lyrics:</strong> Write or paste synced LRC / plain text lyrics into audio tags.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Sleep Timer Widget */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-4 hover:border-primary/30 transition-all duration-300">
            <div className="w-11 h-11 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Timer size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-text">Sleep Timer Widget</h3>
              <p className="text-xs text-text/40 mt-0.5">Click the Timer button on bottom player</p>
            </div>
            <p className="text-sm text-text/60 leading-relaxed">
              Floating popover widget for automatic playback shutdown. Set timers by song count (e.g. 10 songs), custom duration (minutes), or end of current playlist.
            </p>
            <ul className="space-y-2 text-xs text-text/70 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span><strong>Track & Minute Steppers:</strong> Stepper controls to set exact song count or minutes.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span><strong>Floating Popover UI:</strong> Sleek pop-up right above the Timer icon button.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-sky-400 shrink-0" />
                <span><strong>End of Playlist Mode:</strong> Automatically stops playback once the current queue finishes.</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Core Systems */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4 pt-2"
      >
        <div className="flex items-center gap-2 text-xl font-bold text-text">
          <HelpCircle size={22} className="text-primary" />
          <span>Playback & Library Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Synced Karaoke */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-3 hover:border-primary/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <Mic2 size={20} />
            </div>
            <h3 className="text-lg font-bold text-text">Synced Karaoke LRC Engine</h3>
            <p className="text-sm text-text/60 leading-relaxed">
              Supports both standard LRC and Enhanced LRC files. Words highlight smoothly in sync with track playback.
            </p>
            <ul className="space-y-2 text-xs text-text/70 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span><strong>Enhanced LRC:</strong> Exact word timestamps (<code className="text-primary">&lt;00:12.34&gt;</code>).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span><strong>Interactive Seeking:</strong> Click any lyric line or word to seek audio playback.</span>
              </li>
            </ul>
          </div>

          {/* Audio Engine */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-3 hover:border-primary/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <Music size={20} />
            </div>
            <h3 className="text-lg font-bold text-text">Hi-Fi Audio Playback</h3>
            <p className="text-sm text-text/60 leading-relaxed">
              Engineered for high fidelity audio playback with gapless transitions and crossfade capabilities.
            </p>
            <ul className="space-y-2 text-xs text-text/70 pt-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>Format support: FLAC, MP3, WAV, M4A, OGG, ALAC, AAC.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-primary shrink-0" />
                <span>Crossfade and gapless playback settings.</span>
              </li>
            </ul>
          </div>

          {/* Library Scanner */}
          <div className="glass p-6 rounded-2xl border border-white/5 space-y-3 hover:border-primary/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary">
              <FolderOpen size={20} />
            </div>
            <h3 className="text-lg font-bold text-text">Local Library Management</h3>
            <p className="text-sm text-text/60 leading-relaxed">
              Auto-scans local music directories, deduplicates tracks intelligently, and extracts embedded artwork and metadata.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
