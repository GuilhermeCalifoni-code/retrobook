import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, MessageSquare, Send, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar, BookCover, Button, Card, EmptyState, ErrorState, Input, Skeleton } from '@/design-system';
import { PageShell, PageHeader } from '@/layouts/AppLayout';
import { Seo } from '@/components/seo/Seo';
import { useConversation, useConversations, useSendMessage } from '@/features/discovery/use-discovery';
import { useLayoutMode } from '@/features/device-preview';
import { formatRelative } from '@/lib/format';

export function MessagesPage() {
  const { conversationId } = useParams();
  const layout = useLayoutMode();
  const { data, isLoading, isError, refetch } = useConversations();
  const navigate = useNavigate();

  const isMobile = layout === 'mobile';
  // No mobile, lista e conversa sao telas separadas; no desktop, dois paineis.
  const showList = !isMobile || !conversationId;
  const showThread = !isMobile || Boolean(conversationId);

  return (
    <PageShell width="wide">
      <Seo title="Mensagens" noIndex />

      {showList && !conversationId && (
        <PageHeader
          title="Mensagens"
          description="Conversas diretas com leitores. Compartilhe livros e comunidades sem sair do chat."
        />
      )}

      <div
        className={cn(
          'overflow-hidden rounded-card border border-line bg-surface',
          !isMobile && 'grid grid-cols-[19rem_minmax(0,1fr)]',
        )}
        style={{ minHeight: '32rem' }}
      >
        {showList && (
          <div className={cn('flex flex-col', !isMobile && 'border-r border-line')}>
            <div className="border-b border-line px-4 py-3">
              <h2 className="font-display text-base font-semibold text-ink">Conversas</h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading && (
                <div className="space-y-3 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-panel" />
                  ))}
                </div>
              )}

              {isError && (
                <div className="p-4">
                  <ErrorState
                    title="Nao conseguimos carregar suas conversas."
                    onRetry={() => void refetch()}
                  />
                </div>
              )}

              {data && data.items.length === 0 && (
                <div className="p-4">
                  <EmptyState
                    compact
                    icon={<MessageSquare className="h-5 w-5" />}
                    title="Nenhuma conversa ainda."
                    description="Abra o perfil de alguem e comece a falar sobre o livro que voces dividem."
                    action={
                      <Link to="/pessoas">
                        <Button size="sm" variant="outline">
                          Encontrar pessoas
                        </Button>
                      </Link>
                    }
                  />
                </div>
              )}

              <ul className="divide-y divide-line">
                {data?.items.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/mensagens/${conversation.id}`)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised/60',
                        conversationId === conversation.id && 'bg-burgundy/[0.06]',
                      )}
                    >
                      {conversation.with && (
                        <Avatar name={conversation.with.name} src={conversation.with.avatarUrl} size="md" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-ink">
                            {conversation.with?.name ?? 'Conversa'}
                          </span>
                          <time className="shrink-0 text-label text-subtle">
                            {formatRelative(conversation.lastMessageAt)}
                          </time>
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5">
                          <span className={cn('truncate text-xs', conversation.unread ? 'font-medium text-ink' : 'text-muted')}>
                            {conversation.lastMessage?.body ??
                              (conversation.lastMessage?.hasAttachment ? 'Compartilhou algo' : 'Comece a conversa')}
                          </span>
                          {conversation.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-burgundy" />}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {showThread && (
          <div className="flex min-w-0 flex-col">
            {conversationId ? (
              <ConversationThread id={conversationId} onBack={() => navigate('/mensagens')} showBack={isMobile} />
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                  compact
                  icon={<MessageSquare className="h-5 w-5" />}
                  title="Escolha uma conversa"
                  description="Ou comece uma nova a partir do perfil de alguem."
                  className="border-none bg-transparent"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function ConversationThread({ id, onBack, showBack }: { id: string; onBack: () => void; showBack: boolean }) {
  const { data, isLoading, isError, refetch } = useConversation(id);
  const send = useSendMessage(id);
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const body = draft.trim();
    setDraft('');
    await send.mutateAsync({ body });
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        {showBack && (
          <button type="button" onClick={onBack} aria-label="Voltar" className="rounded-full p-1.5 hover:bg-raised">
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </button>
        )}
        {isLoading ? (
          <Skeleton className="h-8 w-40" />
        ) : data?.with ? (
          <Link to={`/u/${data.with.username}`} className="flex items-center gap-2.5">
            <Avatar name={data.with.name} src={data.with.avatarUrl} size="sm" />
            <span>
              <span className="block text-sm font-medium text-ink">{data.with.name}</span>
              <span className="block text-xs text-muted">@{data.with.username}</span>
            </span>
          </Link>
        ) : null}
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" style={{ maxHeight: '26rem' }}>
        {isError && (
          <ErrorState title="Nao conseguimos abrir esta conversa." onRetry={() => void refetch()} />
        )}

        {isLoading && (
          <>
            <Skeleton className="h-10 w-2/3 rounded-sheet" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-sheet" />
          </>
        )}

        {data?.messages.map((message) => (
          <div key={message.id} className={cn('flex', message.isMine ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-sheet px-3.5 py-2.5 text-sm leading-relaxed',
                message.isMine
                  ? 'rounded-br-sm bg-action text-on-brand'
                  : 'rounded-bl-sm bg-raised text-ink',
              )}
            >
              {message.body && <p className="whitespace-pre-line">{message.body}</p>}

              {message.sharedBook && (
                <Link
                  to={`/livro/${message.sharedBook.slug}`}
                  className="mt-2 flex items-center gap-2.5 rounded-panel bg-surface/90 p-2"
                >
                  <BookCover title={message.sharedBook.title} src={message.sharedBook.coverUrl} className="h-12 w-8" flat />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-label uppercase tracking-wider text-subtle">
                      <BookOpen className="h-3 w-3" aria-hidden /> Livro
                    </span>
                    <span className="block truncate text-xs font-medium text-ink">{message.sharedBook.title}</span>
                  </span>
                </Link>
              )}

              {message.sharedCommunity && (
                <Link
                  to={`/c/${message.sharedCommunity.slug}`}
                  className="mt-2 flex items-center gap-2 rounded-panel bg-surface/90 p-2"
                >
                  <Users className="h-4 w-4 text-burgundy" aria-hidden />
                  <span className="truncate text-xs font-medium text-ink">{message.sharedCommunity.name}</span>
                </Link>
              )}

              <time
                className={cn(
                  'mt-1 block text-label',
                  message.isMine ? 'text-on-brand/70' : 'text-subtle',
                )}
              >
                {formatRelative(message.createdAt)}
              </time>
            </div>
          </div>
        ))}

        {data?.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Nenhuma mensagem ainda. Que tal comecar perguntando o que a pessoa esta lendo?
          </p>
        )}

        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line px-4 py-3">
        <Input
          aria-label="Escrever mensagem"
          placeholder="Escreva uma mensagem..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          containerClassName="flex-1"
        />
        <Button type="submit" size="icon" aria-label="Enviar" disabled={!draft.trim()} loading={send.isPending}>
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>
    </>
  );
}
