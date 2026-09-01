import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock, Mail } from 'lucide-react';
import { Button, Input } from '@/design-system';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Seo } from '@/components/seo/Seo';
import { api, ApiError } from '@/lib/api-client';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post<{ devResetToken?: string }>('/auth/forgot-password', { email });
      setDevToken(response.devResetToken ?? null);
      setSent(true);
    } catch {
      // A resposta e sempre a mesma: nao revelamos se o e-mail existe.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Recuperar acesso"
      subtitle="Informe seu e-mail e enviaremos um link para criar uma nova senha."
      footer={
        <Link to="/entrar" className="font-medium text-burgundy hover:underline">
          Voltar para o login
        </Link>
      }
    >
      <Seo title="Recuperar senha" noIndex />

      {sent ? (
        <div className="rounded-card border border-success/30 bg-success/8 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" aria-hidden />
          <p className="font-medium text-ink">Verifique seu e-mail.</p>
          <p className="mt-1.5 text-sm text-muted text-pretty">
            Se existir uma conta com <span className="font-medium text-ink">{email}</span>, o link chegara em instantes.
          </p>

          {devToken && (
            <div className="mt-4 rounded-control border border-gold/30 bg-gold/10 p-3 text-left">
              <p className="text-xs font-medium text-ink">Ambiente de desenvolvimento</p>
              <p className="mt-1 text-xs text-muted">Nao ha servico de e-mail configurado. Use o link abaixo:</p>
              <Link
                to={`/nova-senha?token=${devToken}`}
                className="mt-2 block break-all font-mono text-xs text-burgundy hover:underline"
              >
                /nova-senha?token={devToken.slice(0, 18)}...
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input
            label="E-mail"
            type="email"
            required
            autoComplete="email"
            leftIcon={<Mail className="h-4 w-4" />}
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Enviar link de recuperacao
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('As senhas nao conferem.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/entrar', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao conseguimos atualizar sua senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Criar nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres, letras e numeros.">
      <Seo title="Nova senha" noIndex />

      {!token ? (
        <p className="rounded-control bg-danger/10 px-3 py-2.5 text-sm text-danger">
          Link invalido ou incompleto. Peca um novo link de recuperacao.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Input
            label="Nova senha"
            type="password"
            required
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            label="Confirme a nova senha"
            type="password"
            required
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && (
            <p role="alert" className="rounded-control bg-danger/10 px-3 py-2.5 text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth size="lg" loading={submitting}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'ok' | 'error'>('idle');

  const confirm = async () => {
    try {
      await api.post('/auth/verify-email', { token });
      setState('ok');
    } catch {
      setState('error');
    }
  };

  return (
    <AuthLayout title="Confirmar e-mail" subtitle="Um clique e sua conta fica completa.">
      <Seo title="Confirmar e-mail" noIndex />

      {state === 'ok' ? (
        <div className="rounded-card border border-success/30 bg-success/8 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-success" aria-hidden />
          <p className="font-medium text-ink">E-mail confirmado.</p>
          <Link to="/inicio" className="mt-4 inline-block">
            <Button>Ir para o inicio</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {state === 'error' && (
            <p role="alert" className="rounded-control bg-danger/10 px-3 py-2.5 text-sm text-danger">
              Este link expirou ou ja foi usado.
            </p>
          )}
          <Button fullWidth size="lg" onClick={confirm} disabled={!token}>
            Confirmar meu e-mail
          </Button>
        </div>
      )}
    </AuthLayout>
  );
}
