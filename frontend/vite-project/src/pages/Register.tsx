import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 10) {
      setError('Пароль должен быть минимум 10 символов');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.full_name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || data?.error || 'Ошибка регистрации');
        return;
      }

      const data = await res.json();

      login('', data.id, data.full_name, data.email);
      navigate('/login');
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
    <div className="h-full bg-[#f5f5f7] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] p-5 sm:p-8">
        <Link to="/">
          <div className="flex justify-center bg-[#0071e3] rounded-full mx-auto mb-4 py-1 px-3 shadow-md shadow-[#0071e3]/20 font-['Varela_Round'] transition hover:scale-105 active:scale-95 w-fit">
            <div className="font-bold text-2xl content-center text-white">
              <span className="sm:hidden">PC</span>
              <span className="hidden sm:inline">PiConstruct</span>
            </div>
          </div>
        </Link>
        <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-2 text-center">Регистрация</h1>
        <p className="text-[#6e6e73] text-center mb-8">Создайте аккаунт для начала работы</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1d1d1f] mb-1.5">Имя</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
              placeholder="Минимум 10 символов"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)] disabled:opacity-50"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
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
