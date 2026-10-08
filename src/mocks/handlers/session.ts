import { http, HttpResponse, delay } from 'msw';
import {
  ApiErrorMock,
  createError,
  expireCurrentToken,
  findUserByCredentials,
  newSessionFor,
  requireUser,
  userIdFromToken,
} from '../state';
import { userFixtures } from '../fixtures';

const NETWORK_PROFILE = (import.meta.env.VITE_NETWORK_PROFILE ?? 'standard') as
  | 'standard'
  | 'slow'
  | 'flaky'
  | 'offline';

async function simulateLatency() {
  if (NETWORK_PROFILE === 'offline') {
    throw new ApiErrorMock(503, 'transient', 'Offline simulado.');
  }
  const base =
    NETWORK_PROFILE === 'slow' ? 1200 : NETWORK_PROFILE === 'flaky' ? Math.random() * 800 : 120;
  const jitter = NETWORK_PROFILE === 'flaky' ? Math.random() * 1500 : Math.random() * 80;
  await delay(base + jitter);
}

export const sessionHandlers = [
  http.post('/api/session/login', async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return createError(400, 'validation_failed', 'E-mail e senha são obrigatórios.', {
        email: !body.email ? 'obrigatório' : '',
        password: !body.password ? 'obrigatório' : '',
      });
    }
    const user = findUserByCredentials(body.email, body.password);
    if (!user) {
      return createError(401, 'unauthorized', 'Credenciais inválidas.');
    }
    const session = newSessionFor(user);
    return HttpResponse.json({
      data: { user: session.user, expiresAt: session.expiresAt, token: session.token },
    });
  }),

  http.post('/api/session/register', async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as Record<string, string>;
    const fields: Record<string, string> = {};
    if (!body.displayName) fields.displayName = 'obrigatório';
    if (!body.username) fields.username = 'obrigatório';
    if (!body.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
      fields.email = 'e-mail inválido';
    }
    if (!body.password || body.password.length < 6) {
      fields.password = 'senha precisa ter ao menos 6 caracteres';
    }
    if (Object.keys(fields).length) {
      return createError(400, 'validation_failed', 'Verifique os campos.', fields);
    }
    if (userFixtures.some((u) => u.email === body.email)) {
      return createError(409, 'conflict', 'E-mail já cadastrado.', { email: 'já cadastrado' });
    }
    const newUser = {
      id: `user-${Math.random().toString(36).slice(2, 6)}`,
      displayName: body.displayName,
      username: body.username,
      email: body.email,
      createdAt: new Date().toISOString(),
    };
    userFixtures.push(newUser);
    const session = newSessionFor(newUser);
    return HttpResponse.json({
      data: { user: session.user, expiresAt: session.expiresAt, token: session.token },
    });
  }),

  http.get('/api/session', async ({ request }) => {
    await simulateLatency();
    const user = requireUser(request);
    if (!user) {
      return createError(401, 'unauthorized', 'Sessão expirada.');
    }
    return HttpResponse.json({
      data: { user, expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    });
  }),

  http.post('/api/session/logout', async () => {
    await delay(60);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post('/api/session/expire', async () => {
    expireCurrentToken();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/_debug/whoami', ({ request }) => {
    const user = requireUser(request);
    const token = request.headers.get('authorization') ?? 'none';
    return HttpResponse.json({ token, user, userId: userIdFromToken(token) ?? null });
  }),
];