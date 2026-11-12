import { useNavigate } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import { HeaderTransition } from "../components/HeaderTransition.tsx";
import { useAuth } from '../context/AuthContext';

export function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleStartFree = () => {
    if (isAuthenticated) {
      navigate('/projects');
    } else {
      navigate('/login');
    }
  };

  return (
      <PageTransition>
        <div className="h-full bg-[#f5f5f7] flex flex-col">
          <main className="flex-1 flex items-center justify-center px-4 sm:px-8">
            <div className="text-center max-w-2xl">
              <HeaderTransition text={'Быстрые цифровые табло\nдля бизнеса'} />

              <p className="text-base sm:text-xl text-[#6e6e73] mb-6 sm:mb-10 px-2">
                Создайте меню, рекламный экран или информационную панель для вашего кафе или магазина. Скачайте готовый образ
                для Raspberry Pi и табло готово к работе.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <button
                    onClick={handleStartFree}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[#0071e3] text-white rounded-full font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)] text-base sm:text-lg cursor-pointer"
                >
                  Начать бесплатно
                </button>

                <a
                    href="/pricing"
                    onClick={(e) => { e.preventDefault(); navigate('/pricing'); }}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-white text-[#1d1d1f] rounded-full font-medium hover:bg-[#e8e8ed] transition-all duration-200 border border-[#d2d2d7] text-base sm:text-lg"
                >
                  Тарифы
                </a>
              </div>
            </div>
          </main>
        </div>
      </PageTransition>
  );
}
