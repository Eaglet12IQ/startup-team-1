import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-[#d2d2d7]">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center">
        <Link to="/" className="flex flex-row items-center gap-2 shrink-0">
          <div className="flex justify-center bg-[#0071e3] rounded-full py-1 px-2.5 sm:px-3 shadow-md shadow-[#0071e3]/20 font-['Varela_Round'] transition hover:scale-105 active:scale-95">
            <div className="font-bold text-lg sm:text-2xl content-center text-white">
              <span className="sm:hidden">PC</span>
              <span className="hidden sm:inline">PiConstruct</span>
            </div>
          </div>
        </Link>
        <nav className="flex gap-2 sm:gap-4 items-center text-sm sm:text-base">
          {isAuthenticated ? (
            <>
              <Link
                to="/projects"
                className={`transition-colors relative px-1 ${
                  isActive('/projects')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Проекты
              </Link>
              <Link
                to="/pricing"
                className={`transition-colors relative px-1 ${
                  isActive('/pricing')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Тарифы
              </Link>
              <Link
                to="/profile"
                className={`transition-colors relative px-1 ${
                  isActive('/profile')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Профиль
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className={`transition-colors relative px-1 ${
                  isActive('/pricing')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Тарифы
              </Link>
              <Link to="/login" className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors">
                Войти
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
