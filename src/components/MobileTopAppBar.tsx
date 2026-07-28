import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';

export function MobileTopAppBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/';

  return (
    <header className="flex md:hidden items-center justify-between px-4 h-14 bg-black/40 backdrop-blur-xl border-b border-white/5 sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-3">
        {!isHome ? (
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 active:scale-95 transition-all"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="LocalSpo"
              className="w-7 h-7 object-contain rounded-lg"
            />
            <span className="font-bold text-base tracking-tight text-white">LocalSpo</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/search')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 active:bg-white/10 active:scale-95 transition-all"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      </div>
    </header>
  );
}
