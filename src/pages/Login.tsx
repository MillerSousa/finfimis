import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message.includes('Invalid login')) {
        toast.error('Email ou senha incorretos. Tente novamente.');
      } else if (error.status === 429) {
        toast.error('Muitas tentativas. Aguarde alguns minutos.');
      } else {
        toast.error(error.message);
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) { toast.error('Preencha o email.'); return; }
    setForgotLoading(true);
    await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    toast.success('Se este email estiver cadastrado, você receberá um link para redefinir sua senha.');
    setForgotMode(false);
  };

  if (forgotMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 animate-fade-in">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">💰 Minha Grana</h1>
            <p className="text-muted-foreground text-sm">Redefinir senha</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                className="w-full mt-1 p-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="seu@email.com"
              />
            </div>
            <button type="submit" disabled={forgotLoading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {forgotLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Enviar link de redefinição
            </button>
          </form>
          <button onClick={() => setForgotMode(false)} className="w-full text-center text-sm text-primary">
            ← Voltar para o login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">💰 Minha Grana</h1>
          <p className="text-muted-foreground text-sm">Controle financeiro do seu jeito</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 p-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full mt-1 p-3 pr-12 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-0.5 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>
        </form>

        <button onClick={() => setForgotMode(true)} className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors">
          Esqueci minha senha
        </button>
      </div>
    </div>
  );
}
