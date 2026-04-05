import { Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';

export function Profile() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-semibold text-[#1d1d1f]">Rusberry PI</Link>
          <nav className="flex gap-4 items-center">
            <Link to="/projects" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Проекты</Link>
            <Link to="/pricing" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Тарифы</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-8 py-12">
        <div className="bg-white rounded-2xl shadow-[0_8px_30pxrgb(0,0,0,0.08)] p-8">
          <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-8">Профиль пользователя</h1>
          
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-[#f5f5f7] rounded-full flex items-center justify-center text-3xl font-semibold text-[#6e6e73]">
              А
            </div>
            <div>
              <p className="text-[#6e6e73]">alex@mail.ru</p>
              <span className="inline-block mt-2 px-3 py-1 bg-[#34c759]/10 text-[#34c759] text-sm rounded-full">
                Бесплатный план
              </span>
            </div>
          </div>

          <div className="space-y-6">
                        <div className="flex justify-between items-center">
              <Link
                to="/pricing"
                className="px-6 py-3 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ED] transition-all duration-200"
              >
                Перейти на Про
              </Link>
              <button className="px-6 py-3 bg-[#ff3b30] text-white rounded-xl font-medium hover:bg-[#ff453a] transition-all duration-200">
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
