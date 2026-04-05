import { Link, useLocation } from 'react-router';

export function Header() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="bg-white border-b border-[#d2d2d7]">
      <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
        <Link to="/" className="flex flex-row items-center gap-2">
          <div className="flex justify-center bg-blue-200 rounded-full aspect-square w-12.5 mx-auto border-2 border-blue-400">
            <div className="font-bold text-2xl content-center text-blue-400">PC</div>
          </div>
          <h1 className="text-xl font-semibold text-[#1d1d1f]">PiConstruct</h1>
        </Link>
        <nav className="flex gap-4 items-center">
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
          <Link to="/login" className="px-4 py-2 text-sm text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors">
            Войти
          </Link>
        </nav>
      </div>
    </header>
  );
}
