import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { PageTransition } from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.message || data?.error || 'Неверный email или пароль');
        return;
      }

      const data = await res.json();

      const parts = data.access.split('.');
      let userId = 0;
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        userId = payload.user_id || 0;
      }

      login(data.access, userId, '', formData.email);
      navigate('/projects');
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
        <h1 className="text-2xl font-semibold text-[#1d1d1f] mb-2 text-center">Вход</h1>
        <p className="text-[#6e6e73] text-center mb-8">Войдите в свой аккаунт</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Введите пароль"
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3.5 bg-[#0071e3] text-white rounded-xl font-medium hover:bg-[#0077ED] transition-all duration-200 shadow-[0_4px_12px_rgb(0,113,227,0.3)] disabled:opacity-50"
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <p className="text-center text-sm text-[#6e6e73] mt-6">
          Нет аккаунта?{' '}
          <Link to="/register" className="text-[#0071e3] hover:underline font-medium">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </div>
    </PageTransition>
  );
}
