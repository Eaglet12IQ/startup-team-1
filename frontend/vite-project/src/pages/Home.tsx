import { Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import { Header } from '../components/Header';

export function Home() {
  return (
      <PageTransition>
        <div className="min-h-screen bg-[#f5f5f7] flex flex-col">
          <Header />

          <main className="flex-1 flex items-center justify-center px-8">
            <div className="text-center max-w-2xl">
              <h2 className="text-5xl font-semibold text-[#1d1d1f] mb-6">
                Быстрые цифровые табло<br />для бизнеса
              </h2>

              <p className="text-xl text-[#6e6e73] mb-10">
                Создайте меню, рекламный экран или информационную панель для вашего кафе или магазина. Скачайте готовый образ<br />
                для Raspberry Pi и табло готово к работе.
              </p>

              <div className="flex gap-4 justify-center">
                <Link
                    to="/register"
                    className="px-8 py-4 bg-[#0071e3] text-white rounded-full font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)] text-lg"
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