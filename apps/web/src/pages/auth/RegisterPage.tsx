import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AtSign, Check, Eye, EyeOff, Loader2, Lock, Mail, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, Checkbox, Input } from '@/design-system';
import { AuthLayout } from '@/layouts/AuthLayout';
import { Seo } from '@/components/seo/Seo';
import { api, ApiError } from '@/lib/api-client';
import { useSession } from '@/features/auth/session-context';
import { useDebounced } from '@/features/discovery/use-discovery';

function suggestUsername(name: string) {
  return name
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 24);
}

const passwordChecks = [
  { label: 'Ao menos 8 caracteres', test: (v: string) => v.length >= 8 },
  { label: 'Uma letra', test: (v: string) => /[a-zA-Z]/.test(v) },
  { label: 'Um numero', test: (v: string) => /[0-9]/.test(v) },
];

export function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useSession();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'free' | 'taken'>('idle');

  const debouncedUsername = useDebounced(username, 400);

  // Sugere um @ a partir do nome ate a pessoa editar manualmente.
  useEffect(() => {
    if (!usernameTouched) setUsername(suggestUsername(name));
  }, [name, usernameTouched]);

  useEffect(() => {
    if (debouncedUsername.length < 3) {
      setAvailability('idle');
      return;
    }
    let cancelled = false;
    setAvailability('checking');
    api
      .get<{ available: boolean }>('/auth/username-available', { username: debouncedUsername })
      .then((res) => {
        if (!cancelled) setAvailability(res.available ? 'free' : 'taken');
      })
      .catch(() => {
        if (!cancelled) setAvailability('idle');
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedUsername]);

  if (!isLoading && isAuthenticated) return <Navigate to="/inicio" replace />;

  const passwordScore = passwordChecks.filter((c) => c.test(password)).length;
  const canSubmit = name.length >= 2 && username.length >= 3 && email.includes('@') && passwordScore === 3 && accepted;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register({ name: name.trim(), username, email: email.trim(), password });
      navigate('/boas-vindas', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        setError(Object.keys(err.fieldErrors).length ? null : err.message);
      } else {
        setError('Nao conseguimos falar com o servidor. Verifique sua conexao e tente de novo.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Vamos montar sua estante."
      subtitle="Leva menos de um minuto. Depois a gente encontra suas pessoas."
      footer={
        <>
          Ja tem conta?{' '}
          <Link to="/entrar" className="font-medium text-burgundy hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <Seo title="Criar conta" description="Crie sua conta no RetroBook e encontre leitores como voce." />

      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input
          label="Como podemos te chamar?"
          required
          autoComplete="name"
          leftIcon={<User className="h-4 w-4" />}
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
        />

        <Input
          label="Nome de usuario"
          required
          autoComplete="username"
          leftIcon={<AtSign className="h-4 w-4" />}
          placeholder="seu.usuario"
          value={username}
          onChange={(e) => {
            setUsernameTouched(true);
            setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''));
          }}
          error={fieldErrors.username ?? (availability === 'taken' ? 'Esse nome ja foi escolhido.' : undefined)}
          hint={availability === 'free' ? 'Disponivel.' : 'Letras minusculas, numeros, ponto e underline.'}
          rightSlot={
            availability === 'checking' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-subtle" aria-hidden />
            ) : availability === 'free' ? (
              <Check className="mr-2 h-4 w-4 text-success" aria-hidden />
            ) : availability === 'taken' ? (
              <X className="mr-2 h-4 w-4 text-danger" aria-hidden />
            ) : undefined
          }
        />

        <Input
          label="E-mail"
          type="email"
          required
          autoComplete="email"
          leftIcon={<Mail className="h-4 w-4" />}
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
        />

        <div>
          <Input
            label="Senha"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            leftIcon={<Lock className="h-4 w-4" />}
            placeholder="Crie uma senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
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

          {password.length > 0 && (
            <ul className="mt-2 space-y-1">
              {passwordChecks.map((check) => {
                const ok = check.test(password);
                return (
                  <li
                    key={check.label}
                    className={cn('flex items-center gap-1.5 text-xs', ok ? 'text-success' : 'text-subtle')}
                  >
                    {ok ? <Check className="h-3 w-3" aria-hidden /> : <span className="h-3 w-3" aria-hidden />}
                    {check.label}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Checkbox
          checked={accepted}
          onChange={setAccepted}
          label={
            <>
              Concordo em manter as conversas respeitosas e seguir as regras das comunidades das quais participar.
            </>
          }
        />

        {error && (
          <p role="alert" className="rounded-control bg-danger/10 px-3 py-2.5 text-sm text-danger">
            {error}
          </p>
        )}

        <Button type="submit" fullWidth size="lg" loading={submitting} disabled={!canSubmit}>
          Criar minha conta
        </Button>
      </form>
    </AuthLayout>
  );
}
