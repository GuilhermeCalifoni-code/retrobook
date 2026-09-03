/**
 * E2E de notificacoes da conversa (ciclo 4, fase 10 e 20).
 *
 * Este era o unico fluxo do produto que nunca tinha sido verificado contra a
 * infraestrutura real. Ele roda dois usuarios de verdade e segue o caminho
 * completo:
 *
 *   A cria discussao -> B responde -> A e notificado
 *   A responde a B   -> B e notificado
 *   B responde a resposta -> A e notificado (tipo REPLY, nao COMMENT)
 *
 * E verifica o que sustenta a notificacao: contagem de nao lidas, o link
 * apontar para a discussao certa, marcar como lida e a contagem persistir.
 *
 *   RETROBOOK_API=https://retrobook-api.onrender.com/api npx tsx scripts/e2e-notifications.ts
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

class Actor {
  cookies: Record<string, string> = {};
  constructor(public label: string) {}

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
    for (const raw of res.headers.getSetCookie?.() ?? []) {
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
    return { status: res.status, data };
  }
}

const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

async function signUp(actor: Actor, tag: string) {
  const r = await actor.call('POST', '/auth/register', {
    name: `QA ${tag}`,
    username: `qn${tag}${stamp}`.slice(0, 24),
    email: `qa.notif.${tag}.${stamp}@retrobook.test`,
    password: 'RetroBookQA2026',
  });
  await actor.call('POST', '/onboarding/complete');
  return r;
}

async function main() {
  console.log(`\nRetroBook -- E2E de notificacoes\nalvo: ${BASE}\n`);

  const alice = new Actor('A');
  const bob = new Actor('B');
  const rA = await signUp(alice, 'a');
  const rB = await signUp(bob, 'b');
  check('dois usuarios criados', rA.status === 201 && rB.status === 201);

  // Base limpa: ninguem tem notificacao ainda.
  const zeroA = await alice.call('GET', '/notifications/unread-count');
  check('usuario novo comeca sem notificacao', zeroA.data?.count === 0, `count ${zeroA.data?.count}`);

  // -- A cria a discussao ---------------------------------------------------
  const post = await alice.call('POST', '/posts', {
    type: 'DISCUSSION',
    title: 'O que voces acharam do final?',
    content: 'Abrindo a conversa para validar o fluxo de notificacao em producao.',
  });
  const postId = post.data?.id;
  check('A cria a discussao', Boolean(postId), `status ${post.status}`);

  // -- B responde -> A deve ser notificado ---------------------------------
  const reply1 = await bob.call('POST', `/posts/${postId}/comments`, {
    content: 'Cheguei agora e discordo do final.',
  });
  check('B responde a discussao', reply1.status === 201, `status ${reply1.status}`);

  const countA = await alice.call('GET', '/notifications/unread-count');
  check('A recebe notificacao da resposta', countA.data?.count === 1, `count ${countA.data?.count}`);

  const listA = await alice.call('GET', '/notifications');
  const notif = (listA.data?.items ?? [])[0];
  check('notificacao e do tipo COMMENT', notif?.type === 'COMMENT', `type ${notif?.type}`);
  check('notificacao aponta para a discussao certa', notif?.href === `/post/${postId}`, `href ${notif?.href}`);
  check(
    'notificacao identifica quem agiu',
    notif?.actor?.username === `qnb${stamp}`.slice(0, 24),
    `actor ${notif?.actor?.username}`,
  );
  check('notificacao chega nao lida', notif?.readAt === null || notif?.readAt === undefined);

  // -- B nao e notificado da propria acao ----------------------------------
  const countB0 = await bob.call('GET', '/notifications/unread-count');
  check('B nao e notificado da propria resposta', countB0.data?.count === 0, `count ${countB0.data?.count}`);

  // -- A responde a B -> B deve ser notificado (REPLY) ---------------------
  const commentId = reply1.data?.id;
  const reply2 = await alice.call('POST', `/posts/${postId}/comments`, {
    content: 'Interessante. Por que voce discorda?',
    parentId: commentId,
  });
  check('A responde ao comentario de B', reply2.status === 201, `status ${reply2.status}`);

  const countB = await bob.call('GET', '/notifications/unread-count');
  check('B recebe notificacao da resposta', countB.data?.count === 1, `count ${countB.data?.count}`);

  const listB = await bob.call('GET', '/notifications');
  const notifB = (listB.data?.items ?? [])[0];
  check('resposta a comentario gera tipo REPLY', notifB?.type === 'REPLY', `type ${notifB?.type}`);

  // -- B responde de novo -> A recebe a segunda ----------------------------
  const reply3 = await bob.call('POST', `/posts/${postId}/comments`, {
    content: 'Porque o final resolve rapido demais.',
    parentId: reply2.data?.id,
  });
  check('B responde a resposta', reply3.status === 201, `status ${reply3.status}`);

  const countA2 = await alice.call('GET', '/notifications/unread-count');
  check('A acumula a segunda notificacao', countA2.data?.count === 2, `count ${countA2.data?.count}`);

  // -- Marcar como lida e persistir ----------------------------------------
  const marked = await alice.call('POST', '/notifications/read', { ids: [notif?.id] });
  check('marcar uma como lida responde ok', marked.status === 200, `status ${marked.status}`);

  const countA3 = await alice.call('GET', '/notifications/unread-count');
  check('contagem cai para 1 apos ler uma', countA3.data?.count === 1, `count ${countA3.data?.count}`);

  // Sessao nova = leitura vinda do banco, nao de cache do cliente.
  const aliceAgain = new Actor('A2');
  const login = await aliceAgain.call('POST', '/auth/login', {
    email: `qa.notif.a.${stamp}@retrobook.test`,
    password: 'RetroBookQA2026',
  });
  check('A entra de novo', login.status === 200, `status ${login.status}`);
  const persisted = await aliceAgain.call('GET', '/notifications/unread-count');
  check('a contagem persistiu no banco', persisted.data?.count === 1, `count ${persisted.data?.count}`);

  const readAll = await aliceAgain.call('POST', '/notifications/read', {});
  check('marcar todas como lidas responde ok', readAll.status === 200);
  const zeroAgain = await aliceAgain.call('GET', '/notifications/unread-count');
  check('contagem zera apos marcar todas', zeroAgain.data?.count === 0, `count ${zeroAgain.data?.count}`);

  // -- A notificacao leva mesmo para a conversa ----------------------------
  const target = await aliceAgain.call('GET', `/posts/${postId}`);
  check('o link da notificacao abre a discussao', target.status === 200 && target.data?.post?.id === postId);
  check('a conversa tem as tres respostas', target.data?.post?.commentsCount === 3, `commentsCount ${target.data?.post?.commentsCount}`);
  check('a discussao conta as duas pessoas', target.data?.participantsCount === 2, `participantsCount ${target.data?.participantsCount}`);

  console.log(`\n${pass} passaram, ${fail} falharam`);
  if (failures.length) {
    console.log('\nfalhas:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  console.log(`\ncontas criadas neste teste: qa.notif.a.${stamp}@retrobook.test, qa.notif.b.${stamp}@retrobook.test`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nE2E de notificacoes explodiu:', error);
  process.exit(1);
});
