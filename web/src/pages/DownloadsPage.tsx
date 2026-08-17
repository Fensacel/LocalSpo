import { Download, Info } from 'lucide-react';

export function DownloadsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">Downloads</h1>

      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <Download size={28} className="text-blue-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg mb-2">Downloads</h2>
          <p className="text-white/50 text-sm max-w-md">
            Audio downloads are available in the LocalSpo Desktop application. The web version supports
            streaming playback when a stream backend is configured.
          </p>
        </div>
        <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 max-w-md text-left">
          <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-blue-300/70 text-sm">
            For offline listening and downloads, use the LocalSpo Desktop app which includes
            yt-dlp integration for high-quality audio downloads.
          </p>
        </div>
      </div>
    </div>
  );
}
