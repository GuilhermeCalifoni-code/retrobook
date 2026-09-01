/**
 * Smoke test das funcionalidades da evolucao (nao faz parte do produto).
 *
 * Cobre o que a secao 44 pede: recomendacoes, compatibilidade, spoilers,
 * universo, progresso e metricas. Cada verificacao checa o **comportamento**,
 * nao apenas o status HTTP.
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
  return { status: res.status, data: text ? JSON.parse(text) : null } as { status: number; data: any };
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

async function login(email: string) {
  cookies = {};
  const res = await call('POST', '/auth/login', { email, password: 'retrobook123' });
  if (res.status !== 200) throw new Error(`login falhou para ${email}`);
  return res.data.user;
}

async function main() {
  console.log('\n1. Motor de recomendacao — toda sugestao tem razao');
  await login('guilherme@retrobook.app');

  const home = await call('GET', '/discovery/home');
  check('home responde', home.status === 200);

  const books = home.data?.recommendedBooks ?? [];
  check('livros recomendados', books.length > 0, `${books.length} livros`);
  check(
    'todo livro traz razao',
    books.length > 0 && books.every((b: any) => typeof b.reason === 'string' && b.reason.length > 0),
    books[0]?.reason,
  );

  const people = home.data?.suggestedPeople ?? [];
  check(
    'toda pessoa traz razoes',
    people.length > 0 && people.every((p: any) => Array.isArray(p.reasons) && p.reasons.length > 0),
    people[0] ? `${people[0].name}: ${people[0].reasons[0]?.label}` : '',
  );

  const communities = home.data?.recommendedCommunities ?? [];
  check(
    'toda comunidade traz razao',
    communities.length > 0 && communities.every((c: any) => Array.isArray(c.reasons) && c.reasons.length > 0),
    communities[0]?.reasons?.[0],
  );

  console.log('\n2. Home contextual — sinais vivos');
  const signals = home.data?.signals ?? [];
  check('home devolve sinais', signals.length > 0, `${signals.length} sinais`);
  check(
    'sinais tem destino e acao',
    signals.every((s: any) => s.href && s.cta && s.title),
    signals[0] ? `"${signals[0].title}" -> ${signals[0].cta}` : '',
  );
  check(
    'sinais ordenados por prioridade',
    signals.every((s: any, i: number) => i === 0 || signals[i - 1].priority >= s.priority),
  );

  console.log('\n3. Seu Universo');
  const universe = await call('GET', '/discovery/universe');
  check('universo responde', universe.status === 200);
  check(
    'distribuicao de generos',
    Array.isArray(universe.data?.genres) && universe.data.genres.length > 0,
    universe.data?.genres?.slice(0, 3).map((g: any) => `${g.name} ${g.percent}%`).join(', '),
  );
  const sum = (universe.data?.genres ?? []).reduce((acc: number, g: any) => acc + g.percent, 0);
  check('percentuais somam ~100%', Math.abs(sum - 100) <= 3, `soma ${sum}%`);
  check(
    'conexoes do ciclo',
    universe.data?.connections?.kindredReaders >= 0,
    `${universe.data?.connections?.kindredReaders} leitores afins, ${universe.data?.connections?.communitiesInYourGenres} comunidades`,
  );

  console.log('\n4. Leitores agora');
  const presence = await call('GET', '/discovery/books/duna/presence');
  check('presenca do livro', presence.status === 200, `${presence.data?.readingCount} lendo`);
  check(
    'leitores ordenados por afinidade',
    (presence.data?.readers ?? []).every(
      (r: any, i: number, arr: any[]) => i === 0 || (arr[i - 1].compatibility ?? 0) >= (r.compatibility ?? 0),
    ),
    presence.data?.readers?.[0] ? `top: ${presence.data.readers[0].name} ${presence.data.readers[0].compatibility}%` : '',
  );

  console.log('\n5. Compatibilidade 2.0');
  const profile = await call('GET', '/users/ana.reis');
  const compat = profile.data?.compatibility;
  check('score e razoes', compat?.score > 0, `${compat?.score}%`);
  check(
    'assuntos para conversar',
    Array.isArray(compat?.conversationStarters) && compat.conversationStarters.length > 0,
    compat?.conversationStarters?.map((s: any) => `${s.title} (${s.hint})`).slice(0, 2).join(' | '),
  );

  console.log('\n6. Spoilers inteligentes');
  const bookRes = await call('GET', '/books/duna');
  const bookId = bookRes.data.id;

  // Post com spoiler ate o capitulo 5.
  const spoilerPost = await call('POST', '/posts', {
    type: 'THEORY',
    title: 'Teoria do capitulo 5',
    content: 'Algo importante acontece aqui.',
    bookId,
    containsSpoiler: true,
    spoilerScopeType: 'CHAPTER',
    spoilerScopeValue: 5,
  });
  check('post com alcance estruturado', spoilerPost.status === 201, spoilerPost.data?.spoilerScope);
  check('autor nunca ve spoiler proprio', spoilerPost.data?.viewerSpoiler?.hidden === false);

  // Outra pessoa, sem progresso suficiente, deve ver escondido.
  await login('pedro@retrobook.app');
  const asPedro = await call('GET', `/posts/${spoilerPost.data.id}`);
  check(
    'escondido para quem nao chegou la',
    asPedro.data?.post?.viewerSpoiler?.hidden === true,
    asPedro.data?.post?.viewerSpoiler?.explanation,
  );

  // Beatriz esta lendo Duna: registramos capitulo alem do spoiler e deve liberar.
  await login('beatriz@retrobook.app');
  await call('PATCH', `/library/books/${bookId}`, { currentChapter: 12 });
  const asBeatriz = await call('GET', `/posts/${spoilerPost.data.id}`);
  check(
    'liberado para quem ja passou do capitulo',
    asBeatriz.data?.post?.viewerSpoiler?.hidden === false,
    asBeatriz.data?.post?.viewerSpoiler?.explanation,
  );

  // Preferencia "esconder sempre" tem precedencia.
  await call('PATCH', '/settings', { spoilerPreference: 'ALWAYS_HIDE' });
  const hidden = await call('GET', `/posts/${spoilerPost.data.id}`);
  check('preferencia ALWAYS_HIDE vence o progresso', hidden.data?.post?.viewerSpoiler?.hidden === true);
  await call('PATCH', '/settings', { spoilerPreference: 'HIDE_UNREAD' });

  console.log('\n7. Atualizacao de leitura');
  await login('guilherme@retrobook.app');
  const share = await call('POST', `/library/books/${bookId}/share-progress`, { note: 'A parte 2 mudou tudo.' });
  check('compartilhar progresso', share.status === 201, share.data?.content);
  check('post do tipo READING_UPDATE', share.data?.type === 'READING_UPDATE');
  check('progresso embutido no post', share.data?.progressPercent != null, `${share.data?.progressPercent}%`);

  const flood = await call('POST', `/library/books/${bookId}/share-progress`, { note: 'de novo' });
  check('anti-flood bloqueia repeticao', flood.status === 409, flood.data?.error?.message);

  console.log('\n8. Conclusao de livro');
  const celebration = await call('GET', `/library/books/${bookId}/celebration`);
  check('celebracao responde', celebration.status === 200);
  check(
    'oferece proximos passos',
    Array.isArray(celebration.data?.suggestedNextBooks) && Array.isArray(celebration.data?.suggestedCommunities),
    `${celebration.data?.suggestedNextBooks?.length} livros, ${celebration.data?.suggestedCommunities?.length} comunidades`,
  );

  console.log('\n9. Serendipidade');
  const serendipity = await call('GET', '/discovery/serendipity');
  check('serendipidade responde', serendipity.status === 200, `${serendipity.data?.items?.length} itens`);
  check(
    'itens explicados',
    (serendipity.data?.items ?? []).every((i: any) => typeof i.reason === 'string'),
    serendipity.data?.items?.[0]?.reason,
  );

  console.log('\n10. Metricas e North Star');
  const denied = await call('GET', '/discovery/metrics');
  check('metricas exigem admin', denied.status === 403);

  await call('DELETE', `/posts/${spoilerPost.data.id}`);
  await call('DELETE', `/posts/${share.data.id}`);

  console.log(`\n${pass} passaram, ${fail} falharam\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('smoke da evolucao quebrou:', error);
  process.exit(1);
});
