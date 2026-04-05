import { Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import { Header } from '../components/Header';

const plans = [
  {
    name: 'Бесплатный',
    price: '0',
    period: 'навсегда',
    features: ['Одно табло', 'До 10 элементов на экран', 'Экспорт в JSON'],
    current: true,
  },
  {
    name: 'Бизнес',
    price: '899',
    period: 'в месяц',
    features: [
      'Безлимитные табло',
      'Экспорт готового образа',
      'Шаблоны меню и рекламы',
      'Быстрое обновление через веб-интерфейс',
      'Кастомные шаблоны',
      'API интеграции'
    ],
    current: false,
  }
];

export function Pricing() {
  return (
      <PageTransition>
        <div className="min-h-screen bg-[#f5f5f7]">
          <Header />

          <main className="max-w-6xl mx-auto px-8 py-16">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-semibold text-[#1d1d1f] mb-4">
                Выберите тариф
              </h2>
              <p className="text-xl text-[#6e6e73]">
                Начните бесплатно, переходите на платные тарифы по мере роста
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((plan) => (
                  <div
                      key={plan.name}
                      className={`bg-white rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex flex-col ${
                          plan.current ? 'ring-2 ring-[#0071e3]' : ''
                      }`}
                  >
                    <h3 className="text-xl font-semibold text-[#1d1d1f] mb-2">
                      {plan.name}
                    </h3>

                    <div className="mb-6">
                  <span className="text-4xl font-bold text-[#1d1d1f]">
                    {plan.price}
                  </span>
                      <span className="text-[#6e6e73] ml-1">
                    ₽ {plan.period}
                  </span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                          <li
                              key={feature}
                              className="flex items-center gap-2 text-[#6e6e73]"
                          >
                            <svg
                                className="w-5 h-5 text-[#34c759]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                              <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                              />
                            </svg>
                            {feature}
                          </li>
                      ))}
                    </ul>

                    {/* Кнопка прижата вниз */}
                    <button
                        className={`w-full py-3 rounded-xl font-medium transition-all duration-200 mt-auto ${
                            plan.current
                                ? 'bg-[#f5f5f7] text-[#1d1d1f] cursor-default'
                                : 'bg-[#0071e3] text-white hover:bg-[#0077ED] shadow-[0_4px_12px_rgb(0,113,227,0.3)]'
                        }`}
                        disabled={plan.current}
                    >
                      {plan.current ? 'Текущий план' : 'Выбрать'}
                    </button>
                  </div>
              ))}
            </div>
          </main>
        </div>
      </PageTransition>
  );
}