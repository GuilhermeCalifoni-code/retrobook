/**
 * Smoke test de PRODUCAO.
 *
 * Diferente dos outros tres, este NAO depende do seed de demonstracao: ele
 * comeca de uma base que so tem catalogo (planos, generos, livros) e faz o
 * caminho de um usuario real chegando pela primeira vez.
 *
 * Por isso ele e o unico que pode rodar contra a URL publica:
 *
 *   RETROBOOK_API=https://retrobook-api.exemplo.com/api npm run smoke:prod --workspace @retrobook/api
 *
 * As contas criadas usam o dominio reservado `retrobook.test` e um sufixo
 * aleatorio, para nunca colidirem com gente de verdade nem com uma execucao
 * anterior. Nada e apagado: o script so cria.
 */
const BASE = process.env.RETROBOOK_API ?? 'http://localhost:4000/api';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    fail += 1;
    failures.push(name + (detail ? ` -- ${detail}` : ''));
    console.log(`  FALHA ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

/** Cada ator tem o proprio pote de cookies, como navegadores diferentes. */
class Actor {
  cookies: Record<string, string> = {};

  async call(method: string, path: string, body?: unknown) {
    const cookieHeader = Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const pair = raw.split(';')[0] as string;
      const idx = pair.indexOf('=');
      this.cookies[pair.slice(0, idx)] = pair.slice(idx + 1);
    }

    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, setCookies };
  }
}

const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const PASSWORD = 'RetroBookQA2026';

function emailFor(tag: string) {
  return `qa.${tag}.${stamp}@retrobook.test`;
}

async function register(actor: Actor, tag: string) {
  return actor.call('POST', '/auth/register', {
    name: `QA ${tag}`,
    username: `qa${tag}${stamp}`.slice(0, 24),
    email: emailFor(tag),
    password: PASSWORD,
  });
}

async function main() {
  console.log(`\nRetroBook -- smoke de producao\nalvo: ${BASE}\n`);

  // -- 1. Saude e superficie publica ----------------------------------------
  console.log('[1] saude e acesso publico');
  const anon = new Actor();
  const health = await anon.call('GET', '/health');
  check('health responde ok', health.status === 200 && health.data?.status === 'ok');

  const anonHome = await anon.call('GET', '/discovery/home');
  check('home exige sessao', anonHome.status === 401, `status ${anonHome.status}`);

  const ghost = await anon.call('GET', '/rota-que-nao-existe');
  check('rota inexistente devolve 404 em JSON', ghost.status === 404 && Boolean(ghost.data?.error?.code));

  // -- 2. Cadastro ----------------------------------------------------------
  console.log('\n[2] cadastro');
  const alice = new Actor();
  const reg = await register(alice, 'alice');
  check('cadastro cria conta', reg.status === 201 || reg.status === 200, `status ${reg.status}`);
  check('cadastro ja abre sessao', Object.keys(alice.cookies).length > 0);

  const accessCookie = reg.setCookies.find((c) => c.includes('access')) ?? reg.setCookies[0] ?? '';
  check('cookie de sessao e httpOnly', /HttpOnly/i.test(accessCookie));
  const isNone = /SameSite=None/i.test(accessCookie);
  check('SameSite=None sempre acompanhado de Secure', !isNone || /Secure/i.test(accessCookie));

  const weak = await new Actor().call('POST', '/auth/register', {
    name: 'QA Fraco',
    username: `qaweak${stamp}`.slice(0, 24),
    email: emailFor('weak'),
    password: 'abc',
  });
  check('senha fraca e recusada', weak.status === 422 || weak.status === 400, `status ${weak.status}`);

  const dup = await register(new Actor(), 'alice');
  check('e-mail duplicado e recusado', dup.status === 409 || dup.status === 422, `status ${dup.status}`);

  const me = await alice.call('GET', '/auth/me');
  check('sessao identifica o usuario', me.status === 200 && Boolean(me.data?.user?.id ?? me.data?.id));
  check('hash de senha nunca volta na resposta', !JSON.stringify(me.data).toLowerCase().includes('passwordhash'));

  // -- 3. Onboarding --------------------------------------------------------
  console.log('\n[3] onboarding');
  const genresRes = await alice.call('GET', '/discovery/genres');
  const rawGenres = Array.isArray(genresRes.data)
    ? genresRes.data
    : genresRes.data?.items ?? genresRes.data?.genres ?? [];
  const genreSlugs: string[] = rawGenres.slice(0, 3).map((g: any) => g.slug).filter(Boolean);
  const interests = await alice.call('PUT', '/onboarding/interests', { genreSlugs });
  check('salva interesses', interests.status === 200, `status ${interests.status}`);

  const done = await alice.call('POST', '/onboarding/complete');
  check('conclui onboarding', done.status === 200, `status ${done.status}`);

  // -- 4. Catalogo e biblioteca --------------------------------------------
  console.log('\n[4] catalogo e biblioteca');
  const books = await alice.call('GET', '/books/search?q=duna');
  const list = Array.isArray(books.data) ? books.data : books.data?.items ?? [];
  check('busca de livros responde', books.status === 200 && list.length > 0, `${list.length} resultados`);
  const book = list[0];

  const add = await alice.call('POST', '/library/books', { bookId: book.id, status: 'READING' });
  check('adiciona livro a estante', add.status === 200 || add.status === 201, `status ${add.status}`);

  const progress = await alice.call('PATCH', `/library/books/${book.id}`, { currentChapter: 10, progress: 40 });
  check('atualiza progresso de leitura', progress.status === 200, `status ${progress.status}`);

  const library = await alice.call('GET', '/library');
  const libItems = Array.isArray(library.data) ? library.data : library.data?.items ?? [];
  check('estante mostra o livro', library.status === 200 && libItems.length >= 1);

  // -- 5. Home de usuario novo ---------------------------------------------
  console.log('\n[5] home');
  const home = await alice.call('GET', '/discovery/home');
  check('home responde para usuario novo', home.status === 200, `status ${home.status}`);
  check('home nao quebra com base vazia', home.data !== null && !home.data?.error);

  // -- 6. Comunidade e limite do plano gratuito -----------------------------
  console.log('\n[6] comunidade e plano');
  const c1 = await alice.call('POST', '/communities', {
    name: `QA Clube ${stamp}`,
    description: 'Comunidade criada pelo smoke test de producao para validar o fluxo completo.',
    privacy: 'PUBLIC',
  });
  check('cria comunidade', c1.status === 201 || c1.status === 200, `status ${c1.status}`);
  const slug = c1.data?.slug ?? c1.data?.community?.slug;
  check('comunidade tem slug', Boolean(slug));

  const c2 = await alice.call('POST', '/communities', {
    name: `QA Clube Dois ${stamp}`,
    description: 'Segunda comunidade -- o plano gratuito permite apenas uma.',
    privacy: 'PUBLIC',
  });
  check('backend bloqueia 2a comunidade no plano gratuito', c2.status === 402, `status ${c2.status}`);
  check(
    'bloqueio explica o motivo',
    typeof c2.data?.error?.message === 'string' && c2.data.error.message.length > 10,
  );

  // -- 7. Discussao e resposta de outra pessoa ------------------------------
  console.log('\n[7] discussao');
  const post = await alice.call('POST', '/posts', {
    communitySlug: slug,
    type: 'DISCUSSION',
    title: 'O que voces acharam do primeiro ato?',
    content: 'Abrindo a conversa para validar o fluxo de discussao em producao.',
  });
  check('publica discussao', post.status === 201 || post.status === 200, `status ${post.status}`);
  const postId = post.data?.id ?? post.data?.post?.id;

  const bob = new Actor();
  const regBob = await register(bob, 'bob');
  check('segundo usuario se cadastra', regBob.status === 201 || regBob.status === 200);
  await bob.call('PUT', '/onboarding/interests', { genreSlugs });
  await bob.call('POST', '/onboarding/complete');

  const join = await bob.call('POST', `/communities/${slug}/join`);
  check('segundo usuario entra na comunidade', join.status === 200 || join.status === 201, `status ${join.status}`);

  const reply = await bob.call('POST', `/posts/${postId}/comments`, {
    content: 'Cheguei agora e concordo com voce.',
  });
  check('responde a discussao', reply.status === 201 || reply.status === 200, `status ${reply.status}`);

  const thread = await bob.call('GET', `/posts/${postId}/comments`);
  const comments = Array.isArray(thread.data) ? thread.data : thread.data?.items ?? [];
  check('resposta aparece na discussao', comments.length >= 1, `${comments.length} respostas`);

  // -- 8. Permissoes --------------------------------------------------------
  console.log('\n[8] permissoes');
  const carol = new Actor();
  await register(carol, 'carol');
  await carol.call('POST', '/onboarding/complete');

  const pinByOutsider = await carol.call('PATCH', `/posts/${postId}/pin`, { pinned: true });
  check(
    'nao-membro nao fixa post',
    pinByOutsider.status === 403 || pinByOutsider.status === 404,
    `status ${pinByOutsider.status}`,
  );

  const pinByMember = await bob.call('PATCH', `/posts/${postId}/pin`, { pinned: true });
  check('membro comum nao fixa post', pinByMember.status === 403, `status ${pinByMember.status}`);

  const pinByOwner = await alice.call('PATCH', `/posts/${postId}/pin`, { pinned: true });
  check('dono fixa post', pinByOwner.status === 200, `status ${pinByOwner.status}`);

  const promote = await bob.call('PATCH', `/communities/${slug}/members/qualquer/role`, { role: 'ADMIN' });
  check('membro nao promove ninguem', promote.status === 403 || promote.status === 404, `status ${promote.status}`);

  const deleteOthers = await carol.call('DELETE', `/posts/${postId}`, {});
  check(
    'estranho nao apaga post alheio',
    deleteOthers.status === 403 || deleteOthers.status === 404,
    `status ${deleteOthers.status}`,
  );

  // -- 9. Spoiler resolvido no servidor ------------------------------------
  console.log('\n[9] spoilers');
  const SECRET = 'Detalhe importante que acontece bem depois no livro.';
  const spoiler = await alice.call('POST', '/posts', {
    communitySlug: slug,
    bookId: book.id,
    type: 'DISCUSSION',
    content: SECRET,
    containsSpoiler: true,
    spoilerScopeType: 'CHAPTER',
    spoilerScopeValue: 20,
  });
  check('publica spoiler com escopo', spoiler.status === 201 || spoiler.status === 200, `status ${spoiler.status}`);
  const spoilerId = spoiler.data?.id ?? spoiler.data?.post?.id;

  await bob.call('POST', '/library/books', { bookId: book.id, status: 'READING' });
  await bob.call('PATCH', `/library/books/${book.id}`, { currentChapter: 3 });
  const behind = await bob.call('GET', `/posts/${spoilerId}`);
  check(
    'leitor atrasado ve o spoiler coberto',
    behind.data?.post?.viewerSpoiler?.hidden === true,
    JSON.stringify(behind.data?.post?.viewerSpoiler),
  );
  check(
    'cobertura explica quando vai abrir',
    /capitulo 20/i.test(String(behind.data?.post?.viewerSpoiler?.explanation ?? '')),
    String(behind.data?.post?.viewerSpoiler?.explanation),
  );

  await bob.call('PATCH', `/library/books/${book.id}`, { currentChapter: 25 });
  const ahead = await bob.call('GET', `/posts/${spoilerId}`);
  check(
    'leitor adiantado ve o spoiler liberado',
    ahead.data?.post?.viewerSpoiler?.hidden === false,
    JSON.stringify(ahead.data?.post?.viewerSpoiler),
  );
  check(
    'a decisao mudou sem o cliente pedir nada alem do progresso',
    behind.data?.post?.viewerSpoiler?.hidden !== ahead.data?.post?.viewerSpoiler?.hidden,
  );

  const authorView = await alice.call('GET', `/posts/${spoilerId}`);
  check('autor nunca ve o proprio spoiler coberto', authorView.data?.post?.viewerSpoiler?.hidden === false);

  // -- 9b. Spoiler DENTRO da conversa --------------------------------------
  // O comentario nao tem alcance proprio: herda o da discussao. Ate o ciclo 4
  // o veu do comentario era um booleano fixo, e ficava coberto para sempre --
  // inclusive para quem ja tinha passado do capitulo e para o proprio autor.
  const SECRET_REPLY = 'No capitulo 22 a coisa vira completamente.';
  const spoilerReply = await alice.call('POST', `/posts/${spoilerId}/comments`, {
    content: SECRET_REPLY,
    containsSpoiler: true,
  });
  check('publica comentario com spoiler', spoilerReply.status === 201 || spoilerReply.status === 200);

  await bob.call('PATCH', `/library/books/${book.id}`, { currentChapter: 3 });
  const threadBehind = await bob.call('GET', `/posts/${spoilerId}/comments`);
  const behindItems = threadBehind.data?.items ?? [];
  const behindSpoiler = behindItems.find((c: any) => c.containsSpoiler);
  check(
    'comentario com spoiler fica coberto para leitor atrasado',
    behindSpoiler?.viewerSpoiler?.hidden === true,
    JSON.stringify(behindSpoiler?.viewerSpoiler),
  );

  await bob.call('PATCH', `/library/books/${book.id}`, { currentChapter: 30 });
  const threadAhead = await bob.call('GET', `/posts/${spoilerId}/comments`);
  const aheadSpoiler = (threadAhead.data?.items ?? []).find((c: any) => c.containsSpoiler);
  check(
    'comentario com spoiler libera quando o leitor avanca',
    aheadSpoiler?.viewerSpoiler?.hidden === false,
    JSON.stringify(aheadSpoiler?.viewerSpoiler),
  );

  const threadAuthor = await alice.call('GET', `/posts/${spoilerId}/comments`);
  const ownSpoiler = (threadAuthor.data?.items ?? []).find((c: any) => c.containsSpoiler);
  check('autor nunca ve o proprio comentario coberto', ownSpoiler?.viewerSpoiler?.hidden === false);

  // -- 9c. Conversa: participantes e resposta aninhada ----------------------
  const detail = await alice.call('GET', `/posts/${postId}`);
  check(
    'discussao informa quantas pessoas participam',
    typeof detail.data?.participantsCount === 'number' && detail.data.participantsCount >= 2,
    `participantsCount ${detail.data?.participantsCount}`,
  );

  const rootComments = await alice.call('GET', `/posts/${postId}/comments`);
  const firstComment = (rootComments.data?.items ?? [])[0];
  const nested = await alice.call('POST', `/posts/${postId}/comments`, {
    content: 'Respondendo a resposta, para validar o aninhamento.',
    parentId: firstComment?.id,
  });
  check('responde a uma resposta', nested.status === 201 || nested.status === 200, `status ${nested.status}`);

  const tree = await alice.call('GET', `/posts/${postId}/comments`);
  const parent = (tree.data?.items ?? []).find((c: any) => c.id === firstComment?.id);
  check('resposta aninhada aparece dentro do pai', (parent?.replies?.length ?? 0) >= 1);

  // O texto continua no payload de proposito: "Mostrar mesmo assim" e uma
  // escolha do leitor, feita sem ida ao servidor. O veu e cortesia, nao
  // controle de acesso -- quem contorna so estraga a propria leitura. O que
  // PRECISA vir do servidor e a DECISAO, e e isso que os testes acima cobrem.
  check('conteudo do post nao vem vazio (reveal e client-side por design)', typeof behind.data?.post?.content === 'string');

  // -- 10. Sessao: refresh e logout ----------------------------------------
  console.log('\n[10] sessao');
  const refreshKey = Object.keys(alice.cookies).find((k) => k.includes('refresh')) ?? '';
  const before = alice.cookies[refreshKey];
  const refreshed = await alice.call('POST', '/auth/refresh');
  check('refresh renova a sessao', refreshed.status === 200, `status ${refreshed.status}`);
  check('refresh token e rotacionado', Boolean(refreshKey) && alice.cookies[refreshKey] !== before);

  const stillIn = await alice.call('GET', '/auth/me');
  check('sessao continua valida apos refresh', stillIn.status === 200);

  const logout = await alice.call('POST', '/auth/logout');
  check('logout responde ok', logout.status === 200, `status ${logout.status}`);
  const afterLogout = await alice.call('GET', '/auth/me');
  check('sessao morre no logout', afterLogout.status === 401, `status ${afterLogout.status}`);

  const login = await alice.call('POST', '/auth/login', { email: emailFor('alice'), password: PASSWORD });
  check('login entra de novo', login.status === 200, `status ${login.status}`);

  const badLogin = await new Actor().call('POST', '/auth/login', {
    email: emailFor('alice'),
    password: 'senha-errada-mesmo-2026',
  });
  check('senha errada e recusada', badLogin.status === 401, `status ${badLogin.status}`);
  check(
    'erro de login nao revela se o e-mail existe',
    !/nao encontrado|nao existe|inexistente/i.test(String(badLogin.data?.error?.message ?? '')),
  );

  // -- 11. Validacao e erros -----------------------------------------------
  console.log('\n[11] validacao e erros');
  const invalid = await alice.call('POST', '/posts', { communitySlug: slug, content: '' });
  check(
    'payload invalido devolve 422 com campos',
    invalid.status === 422 && Array.isArray(invalid.data?.error?.details),
    `status ${invalid.status}`,
  );
  check('erro nao expoe stack trace', !JSON.stringify(invalid.data).includes('\\n    at '));
  check('erro nao expoe caminho do servidor', !/[A-Za-z]:\\\\|\/home\/|\/usr\//.test(JSON.stringify(invalid.data)));

  const notFound = await alice.call('GET', '/posts/id-que-nao-existe-mesmo');
  check('recurso inexistente devolve 404', notFound.status === 404, `status ${notFound.status}`);

  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (failures.length) {
    console.log('\nfalhas:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nsmoke de producao explodiu:', error);
  process.exit(1);
});
