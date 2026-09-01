import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, LogOut, Monitor, Moon, Sparkles, Sun } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Skeleton,
  Input,
  SectionHeader,
  Select,
  Switch,
  Textarea,
  useToast,
} from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { api, ApiError } from '@/lib/api-client';
import { useSession } from '@/features/auth/session-context';
import { useUpdateProfile } from '@/features/people/use-people';
import { usePlans, usePlanUsage } from '@/features/discovery/use-discovery';
import { useTheme } from '@/features/theme/use-theme';
import { DevicePreviewSwitcher } from '@/features/device-preview';
import { formatCurrency } from '@/lib/format';
import type { SpoilerPreference, ThemePreference } from '@/types/api';

type Tab = 'conta' | 'perfil' | 'privacidade' | 'notificacoes' | 'aparencia' | 'plano';

const TABS: { value: Tab; label: string }[] = [
  { value: 'conta', label: 'Conta' },
  { value: 'perfil', label: 'Perfil' },
  { value: 'privacidade', label: 'Privacidade' },
  { value: 'notificacoes', label: 'Notificacoes' },
  { value: 'aparencia', label: 'Aparencia' },
  { value: 'plano', label: 'Plano' },
];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('aba') as Tab) ?? 'conta';
  const setTab = (next: Tab) => setParams({ aba: next }, { replace: true });

  const { user, isLoading, refresh, logout } = useSession();
  const toast = useToast();

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-9 w-56" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <Skeleton className="h-48 rounded-card" />
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-card" />
            <Skeleton className="h-40 rounded-card" />
          </div>
        </div>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell>
        <ErrorState
          title="Nao conseguimos carregar suas configuracoes."
          description="Sua sessao pode ter expirado. Entre novamente para continuar."
          onRetry={() => void refresh()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Seo title="Configuracoes" noIndex />

      <PageHeader title="Configuracoes" description="Sua conta, sua privacidade e a aparencia do RetroBook." />

      <div className="grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Secoes das configuracoes">
          <ul className="rb-scroll-x flex gap-1 lg:flex-col">
            {TABS.map((item) => (
              <li key={item.value} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setTab(item.value)}
                  aria-current={tab === item.value ? 'page' : undefined}
                  className={cn(
                    'w-full rounded-panel px-3.5 py-2.5 text-left text-sm font-medium transition-colors',
                    tab === item.value ? 'bg-burgundy/10 text-burgundy' : 'text-muted hover:bg-raised hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0 space-y-6">
          {tab === 'conta' && <AccountSection />}
          {tab === 'perfil' && <ProfileSection />}
          {tab === 'privacidade' && <PrivacySection />}
          {tab === 'notificacoes' && <NotificationsSection />}
          {tab === 'aparencia' && <AppearanceSection />}
          {tab === 'plano' && <PlanSection />}

          {tab === 'conta' && (
            <Card>
              <SectionHeader title="Sessao" subtitle="Encerrar o acesso neste aparelho." />
              <Button
                variant="outline"
                leftIcon={<LogOut className="h-4 w-4" />}
                onClick={async () => {
                  await logout();
                  toast.success('Voce saiu da sua conta.');
                  window.location.href = '/';
                }}
              >
                Sair da conta
              </Button>
              <button
                type="button"
                onClick={async () => {
                  await api.delete('/settings/sessions');
                  await refresh();
                  toast.success('Todas as sessoes foram encerradas.');
                }}
                className="mt-3 block text-sm text-muted hover:text-danger"
              >
                Encerrar sessoes em todos os aparelhos
              </button>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

/* -------------------------------------------------------------------------- */

function AccountSection() {
  const { user, refresh } = useSession();
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  const [name, setName] = useState(user?.profile.name ?? '');
  const [username, setUsername] = useState(user?.profile.username ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    try {
      await updateProfile.mutateAsync({ name, username });
      await refresh();
      toast.success('Conta atualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao conseguimos salvar.');
    }
  };

  const changePassword = async () => {
    setError(null);
    try {
      await api.post('/auth/change-password', { currentPassword, password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Senha atualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nao conseguimos trocar a senha.');
    }
  };

  return (
    <>
      <Card>
        <SectionHeader title="Dados da conta" />
        <div className="space-y-4">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            label="Nome de usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            hint={`Sera o endereco do seu perfil: /u/${username || 'seu.usuario'}`}
          />
          <Input label="E-mail" value={user?.email ?? ''} disabled hint="Fale com o suporte para alterar o e-mail." />

          {!user?.emailVerified && (
            <div className="flex flex-wrap items-center gap-3 rounded-panel border border-gold/30 bg-gold/8 p-3.5">
              <p className="flex-1 text-sm text-muted">Seu e-mail ainda nao foi confirmado.</p>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await api.post('/auth/resend-verification');
                  toast.success('Enviamos um novo link de confirmacao.');
                }}
              >
                Reenviar confirmacao
              </Button>
            </div>
          )}

          {error && <p className="rounded-control bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

          <Button onClick={save} loading={updateProfile.isPending}>
            Salvar alteracoes
          </Button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="Senha" subtitle="Trocar a senha encerra as sessoes abertas." />
        <div className="space-y-4">
          <Input
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            label="Nova senha"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            hint="Minimo de 8 caracteres, com letras e numeros."
          />
          <Button
            variant="outline"
            onClick={changePassword}
            disabled={!currentPassword || newPassword.length < 8}
          >
            Trocar senha
          </Button>
        </div>
      </Card>
    </>
  );
}

function ProfileSection() {
  const { user, refresh } = useSession();
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  const [bio, setBio] = useState(user?.profile.bio ?? '');
  const [location, setLocation] = useState(user?.profile.location ?? '');
  const [website, setWebsite] = useState(user?.profile.website ?? '');
  const [pronouns, setPronouns] = useState(user?.profile.pronouns ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.profile.avatarUrl ?? '');

  const save = async () => {
    await updateProfile.mutateAsync({
      bio: bio || null,
      location: location || null,
      website: website || null,
      pronouns: pronouns || null,
      avatarUrl: avatarUrl || null,
    });
    await refresh();
    toast.success('Perfil atualizado.');
  };

  return (
    <Card>
      <SectionHeader title="Seu perfil" subtitle="E o que outras pessoas veem antes de puxar assunto." />
      <div className="space-y-4">
        <Textarea
          label="Bio"
          placeholder="Conte em poucas linhas o que voce gosta de ler."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          counterMax={280}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Localizacao" placeholder="Cidade, UF" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input label="Pronomes" placeholder="ela/dela" value={pronouns} onChange={(e) => setPronouns(e.target.value)} />
        </div>
        <Input
          label="Site"
          type="url"
          placeholder="https://..."
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
        <Input
          label="URL do avatar"
          type="url"
          placeholder="https://..."
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          hint="Upload de imagem chega junto com o armazenamento de arquivos. Por ora, use um endereco publico."
        />
        <Button onClick={save} loading={updateProfile.isPending}>
          Salvar perfil
        </Button>
      </div>
    </Card>
  );
}

/** Hook comum de configuracoes: escreve em /settings e atualiza a sessao. */
function useSettingsMutation() {
  const { refresh } = useSession();
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  return async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      await api.patch('/settings', patch);
      await refresh();
    } catch {
      toast.error('Nao conseguimos salvar essa preferencia.');
    } finally {
      setSaving(false);
    }
  };
}

function PrivacySection() {
  const { user } = useSession();
  const save = useSettingsMutation();
  const settings = user!.settings;

  return (
    <Card>
      <SectionHeader title="Privacidade" subtitle="Voce decide o que fica visivel no seu perfil." />

      <div className="divide-y divide-line">
        <div className="py-3">
          <Select
            label="Visibilidade do perfil"
            value={settings.visibility}
            onChange={(e) => void save({ visibility: e.target.value })}
          >
            <option value="PUBLIC">Publico — qualquer pessoa pode ver</option>
            <option value="PRIVATE">Privado — apenas quem me segue</option>
          </Select>
        </div>

        <Switch
          checked={settings.showLibrary}
          onChange={(v) => void save({ showLibrary: v })}
          label="Mostrar minha biblioteca"
          description="Favoritos e livros lidos ficam visiveis no perfil."
        />
        <Switch
          checked={settings.showCurrentlyReading}
          onChange={(v) => void save({ showCurrentlyReading: v })}
          label="Mostrar leitura atual"
          description="Permite que outras pessoas te encontrem pelo livro que voce esta lendo."
        />
        <Switch
          checked={settings.showActivity}
          onChange={(v) => void save({ showActivity: v })}
          label="Mostrar atividade"
          description="Resenhas e discussoes aparecem no seu perfil e no feed de quem te segue."
        />
        <Switch
          checked={settings.showCommunities}
          onChange={(v) => void save({ showCommunities: v })}
          label="Mostrar comunidades"
        />
        <Switch
          checked={settings.allowMessages}
          onChange={(v) => void save({ allowMessages: v })}
          label="Permitir mensagens diretas"
          description="Desative para receber mensagens apenas de quem voce segue."
        />
      </div>

      <p className="mt-4 rounded-panel border border-line bg-raised/40 p-3.5 text-xs leading-relaxed text-muted">
        Ocultar a leitura atual reduz bastante suas chances de aparecer em "pessoas lendo o mesmo que voce" — que e a
        principal forma de encontrar gente por aqui.
      </p>
    </Card>
  );
}

function NotificationsSection() {
  const { user } = useSession();
  const save = useSettingsMutation();
  const settings = user!.settings;

  return (
    <Card>
      <SectionHeader title="Notificacoes" subtitle="Escolha o que merece te interromper." />
      <div className="divide-y divide-line">
        <Switch
          checked={settings.notifyComments}
          onChange={(v) => void save({ notifyComments: v })}
          label="Comentarios e respostas"
        />
        <Switch
          checked={settings.notifyFollowers}
          onChange={(v) => void save({ notifyFollowers: v })}
          label="Novos seguidores"
        />
        <Switch
          checked={settings.notifyCommunities}
          onChange={(v) => void save({ notifyCommunities: v })}
          label="Atividade das comunidades"
        />
        <Switch
          checked={settings.notifyRecommendations}
          onChange={(v) => void save({ notifyRecommendations: v })}
          label="Recomendacoes e conexoes"
          description="Avisos do tipo 'voce tem 4 livros em comum com alguem'."
        />
        <Switch
          checked={settings.notifyMessages}
          onChange={(v) => void save({ notifyMessages: v })}
          label="Mensagens diretas"
        />
      </div>
    </Card>
  );
}

function AppearanceSection() {
  const { user } = useSession();
  const { preference, setPreference } = useTheme();
  const [selected, setSelected] = useState<ThemePreference>(user?.settings.theme ?? preference);

  useEffect(() => {
    setSelected(user?.settings.theme ?? preference);
  }, [user?.settings.theme, preference]);

  const save = useSettingsMutation();

  const options: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
    { value: 'LIGHT', label: 'Claro', icon: <Sun className="h-4 w-4" /> },
    { value: 'DARK', label: 'Escuro', icon: <Moon className="h-4 w-4" /> },
    { value: 'SYSTEM', label: 'Do sistema', icon: <Monitor className="h-4 w-4" /> },
  ];

  const spoilerOptions: { value: SpoilerPreference; label: string; description: string }[] = [
    { value: 'ALWAYS_HIDE', label: 'Esconder sempre', description: 'Todo spoiler fica coberto ate eu clicar.' },
    {
      value: 'HIDE_UNREAD',
      label: 'Esconder o que ainda nao li',
      description: 'Spoilers de livros que ja terminei aparecem normalmente.',
    },
    { value: 'ALWAYS_SHOW', label: 'Mostrar sempre', description: 'Nao esconda nada de mim.' },
  ];

  return (
    <>
      <Card>
        <SectionHeader title="Tema" subtitle="O modo escuro do RetroBook e uma biblioteca a noite." />
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected === option.value}
              onClick={() => {
                setSelected(option.value);
                setPreference(option.value, false);
                void save({ theme: option.value });
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-panel border p-4 text-sm font-medium transition-colors',
                selected === option.value
                  ? 'border-burgundy bg-burgundy/8 text-ink'
                  : 'border-line bg-surface text-muted hover:border-subtle',
              )}
            >
              <span className={selected === option.value ? 'text-burgundy' : 'text-subtle'}>{option.icon}</span>
              {option.label}
              {selected === option.value && <Check className="ml-auto h-4 w-4 text-burgundy" aria-hidden />}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader title="Spoilers" subtitle="Como devemos tratar conteudo marcado como spoiler." />
        <div className="space-y-3">
          {spoilerOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={user?.settings.spoilerPreference === option.value}
              onClick={() => void save({ spoilerPreference: option.value })}
              className={cn(
                'flex w-full items-start gap-3 rounded-panel border p-4 text-left transition-colors',
                user?.settings.spoilerPreference === option.value
                  ? 'border-burgundy bg-burgundy/8'
                  : 'border-line bg-surface hover:border-subtle',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink">{option.label}</span>
                <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
              </span>
              {user?.settings.spoilerPreference === option.value && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-burgundy" aria-hidden />
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionHeader
          title="Visualizacao"
          subtitle="Veja a interface como ela aparece em outros aparelhos. Util para avaliar o app antes da versao nativa."
        />
        <DevicePreviewSwitcher />
      </Card>
    </>
  );
}

function PlanSection() {
  const { data: plans } = usePlans();
  const { data: usage } = usePlanUsage();
  const toast = useToast();

  return (
    <>
      {usage && (
        <Card>
          <SectionHeader title={`Seu plano: ${usage.name}`} subtitle="Uso atual dos limites." />
          <div className="space-y-4">
            <UsageBar
              label="Comunidades criadas"
              used={usage.communities.used}
              limit={usage.communities.limit}
            />
            <UsageBar
              label={
                usage.members.community
                  ? `Membros em ${usage.members.community.name}`
                  : 'Membros na maior comunidade'
              }
              used={usage.members.largest}
              limit={usage.members.limit}
            />
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans?.items.map((plan) => {
          const current = usage?.tier === plan.tier;
          return (
            <Card key={plan.tier} className={cn('flex flex-col', current && 'border-burgundy/40')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">{plan.name}</h3>
                  <p className="text-sm text-muted">{plan.tagline}</p>
                </div>
                {current && <Badge tone="burgundy">Plano atual</Badge>}
              </div>

              <p className="mt-4 font-display text-2xl font-semibold text-ink">
                {plan.priceCents === 0 ? 'Gratuito' : formatCurrency(plan.priceCents, plan.currency)}
                {plan.priceCents > 0 && <span className="text-sm font-normal text-muted"> / mes</span>}
              </p>

              <ul className="mt-4 space-y-2 text-sm text-muted">
                <li>
                  {plan.features.maxCommunities === 1
                    ? '1 comunidade propria'
                    : `Ate ${plan.features.maxCommunities} comunidades`}
                </li>
                <li>
                  {plan.features.maxMembersPerCommunity <= 10
                    ? `Ate ${plan.features.maxMembersPerCommunity} membros por comunidade`
                    : 'Membros sem limite pratico'}
                </li>
                {plan.features.allowPrivateCommunities && <li>Comunidades privadas e exclusivas</li>}
                {plan.features.advancedModeration && <li>Ferramentas avancadas de moderacao</li>}
                {plan.features.allowAnalytics && <li>Analytics da comunidade</li>}
              </ul>

              <div className="mt-auto pt-5">
                {current ? (
                  <Button variant="secondary" fullWidth disabled>
                    Voce ja usa este plano
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant={plan.tier === 'PRO' ? 'gold' : 'outline'}
                    leftIcon={<Sparkles className="h-4 w-4" />}
                    onClick={() =>
                      toast.toast(
                        'Pagamento ainda nao esta ativo nesta versao. A arquitetura de assinaturas ja esta pronta no backend.',
                        { tone: 'info' },
                      )
                    }
                  >
                    Migrar para {plan.name}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-subtle">
        Os planos existem para sustentar comunidades grandes.{' '}
        <Link to="/comunidades" className="text-burgundy hover:underline">
          Ver minhas comunidades
        </Link>
      </p>
    </>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const near = percent >= 80;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className={cn('font-mono text-xs', near ? 'text-burgundy' : 'text-subtle')}>
          {used} / {limit >= 1000 ? 'ilimitado' : limit}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-line/60">
        <div
          className={cn('h-full rounded-pill transition-[width] duration-500', near ? 'bg-burgundy' : 'bg-gold')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
