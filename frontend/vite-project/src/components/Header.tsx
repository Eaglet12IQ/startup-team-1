import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, userName, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-[#d2d2d7]">
      <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex flex-row items-center gap-2">
          <div className="flex justify-center bg-blue-500 rounded-full mx-auto py-1 px-3 shadow-md shadow-blue-100 font-['Varela_Round'] transition hover:scale-105 active:scale-95">
            <div className="font-bold text-2xl content-center text-white">PiConstruct</div>
          </div>
        </Link>
        <nav className="flex gap-4 items-center">
          {isAuthenticated ? (
            <>
              <Link
                to="/projects"
                className={`transition-colors relative ${
                  isActive('/projects')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Проекты
              </Link>
              <Link
                to="/pricing"
                className={`transition-colors relative ${
                  isActive('/pricing')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Тарифы
              </Link>
              <Link
                to="/profile"
                className={`transition-colors relative ${
                  isActive('/profile')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Профиль
              </Link>
              <div className="w-px h-6 bg-[#d2d2d7]" />
              <Link
                to="/profile"
                className="text-sm text-[#1d1d1f] hover:text-[#0071e3] transition-colors"
              >
                {userName}
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-[#ff3b30] hover:bg-[#ffe5e5] rounded-lg transition-colors"
              >
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                to="/pricing"
                className={`transition-colors relative ${
                  isActive('/pricing')
                    ? 'text-[#0071e3] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-0.5 after:bg-[#0071e3] after:rounded-full'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                Тарифы
              </Link>
              <Link to="/login" className="px-4 py-2 text-sm text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors">
                Войти
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
