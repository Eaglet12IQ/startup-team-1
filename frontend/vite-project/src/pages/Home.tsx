import { Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';

export function Home() {
  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f5f5f7]">
      <header className="bg-white border-b border-[#d2d2d7]">
        <div className="max-w-6xl mx-auto px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-[#1d1d1f]">Rusberry PI</h1>
          <nav className="flex gap-4 items-center">
            <Link to="/projects" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Проекты</Link>
            <Link to="/profile" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">Профиль</Link>
            <Link to="/login" className="px-4 py-2 text-sm text-[#0071e3] hover:bg-[#f5f5f7] rounded-lg transition-colors">
              Войти
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-8 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-semibold text-[#1d1d1f] mb-6">
            Цифровые табло для бизнеса<br />за 5 минут
          </h2>
          <p className="text-xl text-[#6e6e73] mb-10 max-w-2xl mx-auto">
            Создайте меню, рекламный экран или информационную панель для вашего кафе или магазина. Скачайте готовый образ для Raspberry Pi — и табло готово к работе
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-[#0071e3] text-white rounded-full font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12pxrgb(0,113,227,0.3)] text-lg"
            >
              Начать бесплатно
            </Link>
            <Link
              to="/pricing"
              className="px-8 py-4 bg-white text-[#1d1d1f] rounded-full font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] text-lg"
            >
              Тарифы
            </Link>
          </div>
        </div>
      </main>
    </div>
    </PageTransition>
  );
}
