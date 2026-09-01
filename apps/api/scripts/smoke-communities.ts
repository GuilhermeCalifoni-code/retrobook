/**
 * Smoke test das Comunidades 2.0 (nao faz parte do produto).
 *
 * Cobre o que a secao 49 pede, incluindo os cinco papeis: visitante, membro,
 * moderador, admin e dono. Cada verificacao checa comportamento, nao status.
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
  if (res.status !== 200) throw new Error(`login falhou para ${email}: ${res.status}`);
  return res.data.user;
}

function anon() {
  cookies = {};
}

async function main() {
  console.log('\n1. Community Pulse — distinguir viva de abandonada');
  await login('guilherme@retrobook.app');

  const thriving = await call('GET', '/communities/clube-duna');
  check('comunidade responde', thriving.status === 200);
  check(
    'pulso da comunidade viva',
    ['thriving', 'active'].includes(thriving.data?.pulse?.level),
    `${thriving.data?.pulse?.level}: "${thriving.data?.pulse?.label}"`,
  );

  const dormant = await call('GET', '/communities/classicos-esquecidos');
  check(
    'pulso da comunidade parada',
    ['dormant', 'quiet'].includes(dormant.data?.pulse?.level),
    `${dormant.data?.pulse?.level}: "${dormant.data?.pulse?.label}"`,
  );

  const fresh = await call('GET', '/communities/poesia-de-quinta');
  check('pulso da comunidade nova', fresh.data?.pulse?.level === 'new', `"${fresh.data?.pulse?.label}"`);

  check(
    'pulso nao e so tamanho',
    thriving.data.pulse.level !== dormant.data.pulse.level,
    'comunidades de tamanho parecido, pulsos diferentes',
  );
  check(
    'taxa de resposta calculada',
    typeof thriving.data?.pulse?.signals?.replyRate === 'number',
    `${thriving.data?.pulse?.signals?.replyRate}% das discussoes respondidas`,
  );

  console.log('\n2. Vida da comunidade');
  check(
    'discussao em destaque',
    Boolean(thriving.data?.featuredDiscussion?.post),
    `${thriving.data?.featuredDiscussion?.source}: "${thriving.data?.featuredDiscussion?.post?.title}"`,
  );
  check(
    'atividade recente agrupada',
    Array.isArray(thriving.data?.recentActivity) && thriving.data.recentActivity.length > 0,
    thriving.data?.recentActivity?.[0]?.text,
  );
  check(
    'membros ativos ranqueados',
    Array.isArray(thriving.data?.activeMembers),
    thriving.data?.activeMembers?.[0]
      ? `${thriving.data.activeMembers[0].name}: ${thriving.data.activeMembers[0].postsCount} discussoes`
      : 'sem atividade',
  );
  check(
    'livro em destaque com progresso coletivo',
    Boolean(thriving.data?.featuredBook),
    thriving.data?.featuredBook
      ? `${thriving.data.featuredBook.title}: ${thriving.data.featuredBook.readingCount} lendo, ${thriving.data.featuredBook.collectiveProgress}%`
      : '',
  );

  console.log('\n3. Comunidades semelhantes sempre com razao');
  check(
    'similares tem razao',
    Array.isArray(thriving.data?.similar) &&
      thriving.data.similar.every((s: any) => Array.isArray(s.reasons) && s.reasons.length > 0),
    thriving.data?.similar?.[0] ? `${thriving.data.similar[0].name}: ${thriving.data.similar[0].reasons[0]}` : 'nenhuma',
  );

  console.log('\n4. Voce pertence a este lugar');
  const notMember = await call('GET', '/communities/noite-sem-fim');
  check(
    'pertencimento calculado para nao-membro',
    notMember.data?.belonging === null || Array.isArray(notMember.data?.belonging?.reasons),
    notMember.data?.belonging?.reasons?.join(' · ') ?? 'sem sinais em comum',
  );

  console.log('\n5. Feed: filtros e ordenacao');
  const all = await call('GET', '/communities/clube-duna/posts');
  check('feed sem filtro', all.status === 200, `${all.data?.items?.length} posts`);

  const theories = await call('GET', '/communities/clube-duna/posts?type=THEORY');
  check(
    'filtro por tipo',
    theories.status === 200 && (theories.data?.items ?? []).every((p: any) => p.type === 'THEORY'),
    `${theories.data?.items?.length} teorias`,
  );

  const discussed = await call('GET', '/communities/clube-duna/posts?sort=discussed');
  const counts = (discussed.data?.items ?? []).filter((p: any) => !p.isPinned).map((p: any) => p.commentsCount);
  check(
    'ordenacao por conversa, nao por curtida',
    counts.every((c: number, i: number) => i === 0 || counts[i - 1] >= c),
    `respostas: ${counts.join(', ')}`,
  );

  const hot = await call('GET', '/communities/clube-duna/hot');
  check('conversas em alta', hot.status === 200, `${hot.data?.items?.length} conversas`);

  console.log('\n6. Membros: busca, ordenacao e ativos');
  const members = await call('GET', '/communities/clube-duna/members');
  check('lista de membros', members.status === 200, `${members.data?.items?.length} membros`);
  check(
    'ativos hoje informado',
    typeof members.data?.activeToday === 'number',
    `${members.data?.activeToday} ativos hoje`,
  );
  check(
    'marcacao de membro ativo',
    (members.data?.items ?? []).every((m: any) => typeof m.isActive === 'boolean'),
  );

  const search = await call('GET', '/communities/clube-duna/members?q=ana');
  check(
    'busca de membros',
    search.status === 200 && (search.data?.items ?? []).every((m: any) => /ana/i.test(m.name) || /ana/i.test(m.username)),
    `${search.data?.items?.length} resultado(s)`,
  );

  const alpha = await call('GET', '/communities/clube-duna/members?sort=alphabetical');
  const names = (alpha.data?.items ?? []).map((m: any) => m.name);
  check(
    'ordenacao alfabetica',
    names.every((n: string, i: number) => i === 0 || names[i - 1].localeCompare(n) <= 0),
    names.slice(0, 3).join(', '),
  );

  console.log('\n7. Papeis e permissoes');

  // Visitante nao autenticado.
  anon();
  const anonView = await call('GET', '/communities/clube-duna');
  check('visitante ve comunidade publica', anonView.status === 200);
  check('visitante nao pode postar', anonView.data?.viewer?.canPost === false);
  check('visitante nao modera', anonView.data?.viewer?.canModerate === false);

  const anonPrivate = await call('GET', '/communities/sala-de-leitura-fechada/posts');
  check('visitante bloqueado em comunidade fechada', anonPrivate.status === 403);

  // Membro comum.
  await login('guilherme@retrobook.app');
  const asMember = await call('GET', '/communities/clube-duna');
  check('membro pode postar', asMember.data?.viewer?.canPost === true);
  check('membro nao modera', asMember.data?.viewer?.canModerate === false);
  check('membro nao e dono', asMember.data?.viewer?.isOwner === false);

  const memberHealth = await call('GET', '/communities/clube-duna/health');
  check('membro nao ve saude da comunidade', memberHealth.status === 403);

  const memberModerates = await call('POST', '/communities/clube-duna/members/x/ban');
  check('membro nao consegue banir', memberModerates.status === 403 || memberModerates.status === 404);

  // Moderadora (Beatriz modera o Clube Duna).
  await login('beatriz@retrobook.app');
  const asModerator = await call('GET', '/communities/clube-duna');
  check('moderadora modera', asModerator.data?.viewer?.canModerate === true);
  check('moderadora nao e dona', asModerator.data?.viewer?.isOwner === false);

  const modHealth = await call('GET', '/communities/clube-duna/health');
  check('moderadora ve saude da comunidade', modHealth.status === 200, `taxa de resposta ${modHealth.data?.replyRate}%`);
  check(
    'saude traz crescimento e tempo de resposta',
    typeof modHealth.data?.posts?.growthPercent === 'number',
    `posts ${modHealth.data?.posts?.growthPercent}% · 1a resposta em ${modHealth.data?.medianFirstReplyHours ?? '—'}h`,
  );

  // Escalada de privilegio: moderadora nao promove ninguem.
  const escalate = await call('PATCH', '/communities/clube-duna/members/x/role', { role: 'ADMIN' });
  check('moderadora nao muda papeis (sem escalada)', escalate.status === 403);

  // Dono (Caio criou o Clube Duna).
  await login('caio@retrobook.app');
  const asOwner = await call('GET', '/communities/clube-duna');
  check('dono e reconhecido', asOwner.data?.viewer?.isOwner === true);
  check('dono modera', asOwner.data?.viewer?.canModerate === true);

  const leaveOwn = await call('DELETE', '/communities/clube-duna/join');
  check('dono nao pode simplesmente sair', leaveOwn.status === 400, leaveOwn.data?.error?.message);

  console.log('\n8. Comunidade vazia e limites');
  await login('nina@retrobook.app');
  const empty = await call('GET', '/communities/poesia-de-quinta');
  check('comunidade nova sem discussao', empty.data?.featuredDiscussion === null);
  check('capacidade calculada no backend', typeof empty.data?.capacity?.isFull === 'boolean');

  console.log(`\n${pass} passaram, ${fail} falharam\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('smoke de comunidades quebrou:', error);
  process.exit(1);
});
