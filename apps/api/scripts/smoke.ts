/**
 * Smoke test manual da API (nao faz parte do produto).
 * Percorre a jornada principal: entrar -> home -> livro -> biblioteca ->
 * comunidade -> discussao -> comentario -> curtida -> seguir -> notificacoes.
 */
const BASE = 'http://localhost:4000/api';

let cookies: Record<string, string> = {};

function cookieHeader() {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(Object.keys(cookies).length ? { Cookie: cookieHeader() } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(';');
    const idx = pair!.indexOf('=');
    cookies[pair!.slice(0, idx)] = pair!.slice(idx + 1);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { status: res.status, data } as { status: number; data: any };
}

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`  FALHA ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function main() {
  console.log('\n1. Autenticacao');
  const login = await call('POST', '/auth/login', {
    email: 'guilherme@retrobook.app',
    password: 'retrobook123',
  });
  check('login', login.status === 200, `${login.data?.user?.profile?.name} / plano ${login.data?.user?.plan?.name}`);

  const bad = await call('POST', '/auth/login', { email: 'guilherme@retrobook.app', password: 'errada123' });
  check('senha errada rejeitada', bad.status === 401);

  const me = await call('GET', '/auth/me');
  check('sessao ativa', me.status === 200, `@${me.data?.user?.profile?.username}`);

  console.log('\n2. Home e descoberta');
  const home = await call('GET', '/discovery/home');
  check('home', home.status === 200);
  check(
    'continuar lendo',
    home.data?.currentlyReading?.length > 0,
    `${home.data?.currentlyReading?.length} livro(s)`,
  );
  const companion = home.data?.readingCompanions?.[0];
  check(
    'pessoas lendo o mesmo',
    Array.isArray(home.data?.readingCompanions),
    companion ? `"${companion.book.title}" com mais ${companion.othersCount}` : 'sem companhia ainda',
  );
  const person = home.data?.suggestedPeople?.[0];
  check(
    'compatibilidade literaria',
    home.data?.suggestedPeople?.length > 0,
    person ? `${person.name} ${person.compatibility}% (${person.reasons?.[0]?.label})` : '',
  );
  check('comunidades recomendadas', home.data?.recommendedCommunities?.length > 0);
  check('livros recomendados', home.data?.recommendedBooks?.length > 0,
    home.data?.recommendedBooks?.[0] ? `"${home.data.recommendedBooks[0].title}" — ${home.data.recommendedBooks[0].reason}` : '');

  const search = await call('GET', '/discovery/search?q=duna');
  check(
    'busca global',
    search.status === 200,
    `${search.data?.books?.length} livros, ${search.data?.communities?.length} comunidades, ${search.data?.discussions?.length} discussoes`,
  );

  const trending = await call('GET', '/discovery/trending');
  check('em alta', trending.status === 200, `${trending.data?.books?.length} livros`);

  console.log('\n3. Livros e biblioteca');
  const book = await call('GET', '/books/duna');
  check('pagina do livro', book.status === 200, `"${book.data?.title}" — ${book.data?.readingCount} lendo`);
  check('leitores listados', book.data?.readers?.length > 0, `${book.data?.readers?.length} pessoas`);
  check('comunidades do livro', book.data?.communities?.length > 0);
  check('discussoes do livro', book.data?.discussions?.length > 0);
  check('entrada na biblioteca', book.data?.viewerEntry?.status === 'READING', `${book.data?.viewerEntry?.progress}%`);

  const progressed = await call('PATCH', `/library/books/${book.data.id}`, { currentPage: 182 });
  check('registrar progresso', progressed.status === 200, `pag. ${progressed.data?.currentPage} = ${progressed.data?.progress}%`);

  const library = await call('GET', '/library');
  check('biblioteca', library.status === 200, `${library.data?.items?.length} livros, ${library.data?.counts?.READ} lidos`);

  const newBook = await call('GET', '/books/search?q=neuromancer');
  const target = newBook.data?.items?.[0];
  const added = await call('POST', '/library/books', { bookId: target.id, status: 'WANT_TO_READ' });
  check('adicionar a biblioteca', added.status === 201, `"${added.data?.book?.title}" -> ${added.data?.status}`);
  await call('DELETE', `/library/books/${target.id}`);

  console.log('\n4. Comunidades');
  const communities = await call('GET', '/communities');
  check('descobrir comunidades', communities.status === 200, `${communities.data?.items?.length} publicas`);

  const community = await call('GET', '/communities/clube-duna');
  check('pagina da comunidade', community.status === 200, `${community.data?.name} — ${community.data?.membersCount} membros`);
  check('regras', community.data?.rules?.length > 0, `${community.data?.rules?.length} regras`);
  check('moderadores', community.data?.moderators?.length > 0);
  check('capacidade do plano', community.data?.capacity?.limit !== undefined, `limite ${community.data?.capacity?.limit}`);

  const cposts = await call('GET', '/communities/clube-duna/posts');
  check('discussoes da comunidade', cposts.status === 200, `${cposts.data?.items?.length} posts`);

  const privateCommunity = await call('GET', '/communities/sala-de-leitura-fechada');
  check(
    'comunidade exclusiva nao vaza conteudo',
    privateCommunity.data?.viewer?.canViewContent === false,
    `privacidade ${privateCommunity.data?.privacy}`,
  );
  const privatePosts = await call('GET', '/communities/sala-de-leitura-fechada/posts');
  check('posts de comunidade fechada bloqueados', privatePosts.status === 403);

  const joinRequest = await call('POST', '/communities/sala-de-leitura-fechada/join');
  check('solicitacao de entrada', joinRequest.data?.status === 'PENDING');

  console.log('\n5. Limites de plano');
  const usage = await call('GET', '/subscriptions/usage');
  check('uso do plano', usage.status === 200, `${usage.data?.name}: ${usage.data?.communities.used}/${usage.data?.communities.limit} comunidades`);

  const privateAttempt = await call('POST', '/communities', {
    name: 'Teste privado',
    description: 'Comunidade de teste para validar o limite do plano gratuito.',
    privacy: 'PRIVATE',
  });
  check('plano gratuito bloqueia comunidade privada', privateAttempt.status === 402, privateAttempt.data?.error?.message);

  // O teste roda varias vezes contra o mesmo banco: o resultado esperado
  // depende de quantas comunidades a conta ja tem, nao de um estado fixo.
  const atLimit = usage.data.communities.used >= usage.data.communities.limit;

  const created = await call('POST', '/communities', {
    name: `Leituras de Inverno ${Date.now()}`,
    tagline: 'Livros longos para dias curtos.',
    description: 'Comunidade criada pelo smoke test para validar o wizard de criacao ponta a ponta.',
    privacy: 'PUBLIC',
    tags: ['inverno', 'leitura-lenta'],
    rules: [{ title: 'Respeite os outros membros' }],
  });

  if (atLimit) {
    check('limite de comunidades aplicado', created.status === 402, created.data?.error?.message);
  } else {
    check('criar primeira comunidade', created.status === 201, created.data?.slug);
    const second = await call('POST', '/communities', {
      name: 'Outra comunidade',
      description: 'Segunda tentativa, deve bater no limite de 1 comunidade do plano gratuito.',
      privacy: 'PUBLIC',
    });
    check('limite de 1 comunidade aplicado', second.status === 402, second.data?.error?.message);
  }

  console.log('\n6. Discussoes');
  const post = await call('POST', '/posts', {
    type: 'QUESTION',
    title: 'Alguem mais parou na parte 2?',
    content: 'Estou na pagina 182 e queria saber se vale acelerar ou ler devagar.',
    bookId: book.data.id,
    tags: ['duna'],
  });
  check('criar discussao', post.status === 201, post.data?.title);

  const quoteNoBook = await call('POST', '/posts', {
    type: 'QUOTE',
    content: 'Trecho sem livro',
    quoteText: 'Um trecho qualquer.',
  });
  check('citacao exige livro de origem', quoteNoBook.status === 422 || quoteNoBook.status === 400);

  const longQuote = await call('POST', '/posts', {
    type: 'QUOTE',
    content: 'Trecho longo demais',
    bookId: book.data.id,
    quoteText: 'x'.repeat(600),
  });
  check('citacao longa recusada (copyright)', longQuote.status === 422 || longQuote.status === 400);

  const comment = await call('POST', `/posts/${post.data.id}/comments`, {
    content: 'Eu li devagar e valeu muito a pena.',
  });
  check('comentar', comment.status === 201);

  const reply = await call('POST', `/posts/${post.data.id}/comments`, {
    content: 'Concordo, a parte 2 muda o ritmo.',
    parentId: comment.data.id,
  });
  check('responder comentario', reply.status === 201);

  const detail = await call('GET', `/posts/${post.data.id}`);
  check(
    'arvore de comentarios',
    detail.data?.comments?.[0]?.replies?.length === 1,
    `${detail.data?.comments?.length} raiz, ${detail.data?.comments?.[0]?.replies?.length} resposta`,
  );

  const like = await call('POST', `/posts/${post.data.id}/reaction`);
  check('curtir', like.data?.liked === true && like.data?.likesCount === 1);
  const unlike = await call('POST', `/posts/${post.data.id}/reaction`);
  check('descurtir', unlike.data?.liked === false && unlike.data?.likesCount === 0);

  const saved = await call('POST', `/posts/${post.data.id}/save`);
  check('salvar discussao', saved.data?.saved === true);

  const locked = await call('PATCH', `/posts/${post.data.id}/lock`, { locked: true });
  check('fechar discussao', locked.data?.isLocked === true);
  const blockedComment = await call('POST', `/posts/${post.data.id}/comments`, { content: 'tentando' });
  check('discussao fechada recusa comentario', blockedComment.status === 403);
  await call('PATCH', `/posts/${post.data.id}/lock`, { locked: false });

  console.log('\n7. Pessoas');
  const feed = await call('GET', '/posts/feed');
  check('feed', feed.status === 200, `${feed.data?.items?.length} posts`);

  const profile = await call('GET', '/users/ana.reis');
  check('perfil publico', profile.status === 200, `${profile.data?.name}`);
  check(
    'compatibilidade no perfil',
    profile.data?.compatibility?.score >= 0,
    `${profile.data?.compatibility?.score}% — ${profile.data?.compatibility?.reasons?.map((r: any) => r.label).join(', ')}`,
  );

  const follow = await call('POST', '/users/nina.costa/follow');
  check('seguir', follow.data?.following === true);
  const unfollow = await call('DELETE', '/users/nina.costa/follow');
  check('deixar de seguir', unfollow.data?.following === false);

  const suggested = await call('GET', '/users/suggested?limit=5');
  check('sugestoes de pessoas', suggested.data?.items?.length > 0, `top: ${suggested.data?.items?.[0]?.compatibility}%`);

  console.log('\n8. Notificacoes, mensagens e estatisticas');
  const notifications = await call('GET', '/notifications');
  check('notificacoes', notifications.status === 200, `${notifications.data?.items?.length} itens`);

  const conversations = await call('GET', '/messages');
  check('conversas', conversations.status === 200, `${conversations.data?.items?.length} conversa(s)`);
  if (conversations.data?.items?.[0]) {
    const thread = await call('GET', `/messages/${conversations.data.items[0].id}`);
    check('mensagens da conversa', thread.data?.messages?.length > 0, `${thread.data?.messages?.length} mensagens`);
    const sent = await call('POST', `/messages/${conversations.data.items[0].id}`, { body: 'Cheguei na parte 2.' });
    check('enviar mensagem', sent.status === 201);
  }

  const stats = await call('GET', '/stats/reading');
  check('estatisticas', stats.status === 200, `${stats.data?.counts?.READ} lidos, ${stats.data?.pagesRead} paginas`);

  const achievements = await call('GET', '/users/me/achievements');
  const unlocked = achievements.data?.items?.filter((a: any) => a.unlockedAt) ?? [];
  check('conquistas', achievements.status === 200, `${unlocked.length} desbloqueadas`);

  console.log('\n9. Seguranca');
  const anon = await fetch(`${BASE}/discovery/home`);
  check('home exige sessao', anon.status === 401);

  const xss = await call('POST', '/posts', {
    type: 'DISCUSSION',
    content: 'Ola <script>alert(1)</script> mundo',
  });
  check('script removido do conteudo', !String(xss.data?.content).includes('<script'), xss.data?.content);

  const badPayload = await call('POST', '/posts', { type: 'DISCUSSION', content: '' });
  check('validacao de payload', badPayload.status === 422);

  await call('DELETE', `/posts/${xss.data?.id}`);
  await call('DELETE', `/posts/${post.data.id}`);

  console.log(`\n${pass} passaram, ${fail} falharam\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('smoke test quebrou:', error);
  process.exit(1);
});
