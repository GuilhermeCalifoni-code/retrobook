import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button, Input } from '@/design-system';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Seo } from '@/components/seo/Seo';
import { ApiError } from '@/lib/api-client';
import { useSession } from '@/features/auth/session-context';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) return <Navigate to="/inicio" replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      const from = (location.state as { from?: string } | null)?.from;
      navigate(user.profile.onboardingCompleted ? (from ?? '/inicio') : '/boas-vindas', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Nao conseguimos falar com o servidor. Verifique sua conexao e tente de novo.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Que bom te ver de novo."
      subtitle="Entre para continuar de onde parou na sua estante."
      footer={
        <>
          Ainda nao tem conta?{' '}
          <Link to="/criar-conta" className="font-medium text-burgundy hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      <Seo title="Entrar" description="Acesse sua conta do RetroBook." noIndex />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Senha"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          leftIcon={<Lock className="h-4 w-4" />}
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="rounded-full p-2 text-subtle transition-colors hover:text-ink"
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link to="/recuperar-senha" className="text-sm text-muted hover:text-burgundy hover:underline">
            Esqueci minha senha
          </Link>
        </div>

        {error && (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={submitting}>
          Entrar
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-subtle">
        <span className="h-px flex-1 bg-line" />
        ou
        <span className="h-px flex-1 bg-line" />
      </div>

      {/*
        Login social: o backend ja aceita a identidade verificada em /auth/social.
        Falta apenas plugar o SDK do provedor — por isso o botao esta desativado
        e diz o que esta acontecendo, em vez de fingir que funciona.
      */}
      <Button variant="outline" fullWidth disabled title="Disponivel na proxima versao">
        Continuar com Google (em breve)
      </Button>

      <div className="mt-6 rounded-panel border border-gold/30 bg-gold/8 p-3.5 text-xs leading-relaxed text-muted">
        <p className="font-medium text-ink">Conta de demonstracao</p>
        <p className="mt-1">
          <button
            type="button"
            className="font-mono text-burgundy hover:underline"
            onClick={() => {
              setEmail('guilherme@retrobook.app');
              setPassword('retrobook123');
            }}
          >
            guilherme@retrobook.app / retrobook123
          </button>{' '}
          — clique para preencher.
        </p>
      </div>
    </AuthLayout>
  );
}
