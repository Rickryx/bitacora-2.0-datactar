
import React, { useState } from 'react';
import { supabase } from '../services/supabase';

interface LoginViewProps {
  onLogin: () => void; // Changed signature since parent handles user state
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // onLogin is just a trigger now, user state is handled in App.tsx via auth subscription
      // but we can call it to transition view if needed, though App.tsx listener is better
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-8 bg-white overflow-hidden">
      <div className="pt-8">
        <h1 className="text-primary text-4xl font-extrabold tracking-tight">Bitácora 2.0</h1>
        <p className="text-slate-500 text-lg font-medium">Datactar</p>
      </div>

      <main className="flex-1 flex flex-col justify-center">
        <div className="space-y-8 w-full">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-slate-900">Bienvenido</h2>
            <p className="text-slate-500">Inicie sesión para continuar con su turno.</p>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 ml-1">Correo Electrónico</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:border-primary focus:ring-0 rounded-2xl shadow-sm transition-all"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guardia@datactar.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700 ml-1">Contraseña</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">lock</span>
                  <input
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent focus:border-primary focus:ring-0 rounded-2xl shadow-sm transition-all"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              className="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <span className="material-symbols-outlined">login</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center pt-8">
        <p className="text-xs text-slate-400 max-w-[240px] mx-auto">
          Contácte a su administrador si olvidó sus credenciales
        </p>
        <div className="mt-6 h-1 w-24 bg-slate-100 rounded-full mx-auto"></div>
      </footer>
    </div>
  );
};

export default LoginView;
