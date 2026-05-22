import { Link, useNavigate } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';

export function Profile() {
  const { userName, userEmail, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <PageTransition>
    <div className="h-full bg-[#f5f5f7] overflow-auto">
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-12">
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] mb-6 sm:mb-8">Профиль пользователя</h1>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8 text-center sm:text-left">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#f5f5f7] rounded-full flex items-center justify-center text-2xl sm:text-3xl font-semibold text-[#6e6e73] shrink-0">
              {userName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base sm:text-lg font-medium text-[#1d1d1f]">{userName}</p>
              <p className="text-sm sm:text-base text-[#6e6e73]">{userEmail}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-[#34c759]/10 text-[#34c759] text-xs sm:text-sm rounded-full">
                Бесплатный план
              </span>
            </div>
          </div>

          <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
              <Link
                to="/pricing"
                className="w-full sm:w-auto text-center px-6 py-3 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ED] transition-all duration-200"
              >
                Перейти на Про
              </Link>
              <button
                onClick={handleLogout}
                className="w-full sm:w-auto text-center px-6 py-3 bg-[#ff3b30] text-white rounded-xl font-medium hover:bg-[#ff453a] transition-all duration-200"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
    </PageTransition>
  );
}
