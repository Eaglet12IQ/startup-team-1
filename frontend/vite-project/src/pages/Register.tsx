import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register:', formData);
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-8">
        <Link to="/">
          <div className="flex justify-center bg-blue-200 rounded-full aspect-square w-12.5 mx-auto border-2 border-blue-400">
            <div className="font-bold text-2xl content-center text-blue-400">PC</div>
          </div>
        </Link>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-2 text-center">Регистрация</h1>
        <p className="text-[#6e6e73] text-center mb-8">Создайте аккаунт для начала работы</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Имя</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
              placeholder="Введите ваше имя"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
              placeholder="example@mail.ru"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Пароль</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-[#f5f5f7] rounded-xl text-[#1d1d1f] outline-none focus:ring-2 focus:ring-[#0071e3] transition-all duration-200"
              placeholder="Минимум 8 символов"
            />
          </div>
          <button
            type="submit"
            className="w-full px-6 py-3.5 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)]"
          >
            Зарегистрироваться
          </button>
        </form>

        <p className="text-center text-sm text-[#6e6e73] mt-6">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-[#0071e3] hover:underline font-medium">
            Войдите
          </Link>
        </p>
      </div>
    </div>
    </PageTransition>
  );
}
