import { http, HttpResponse, delay } from 'msw';
import { ApiErrorMock, createError, requireUser } from '../state';
import { userFixtures } from '../fixtures';

export const profileHandlers = [
  http.get('/api/profile', async ({ request }) => {
    await delay(120);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão expirada.');
    return HttpResponse.json({ data: user });
  }),

  http.patch('/api/profile', async ({ request }) => {
    await delay(140);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão expirada.');
    const body = (await request.json()) as Record<string, string>;
    const fields: Record<string, string> = {};
    if (body.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
      fields.email = 'e-mail inválido';
    }
    if (body.username && body.username.length < 3) {
      fields.username = 'mínimo 3 caracteres';
    }
    if (Object.keys(fields).length) {
      return createError(400, 'validation_failed', 'Verifique os campos.', fields);
    }
    Object.assign(user, body);
    return HttpResponse.json({ data: user });
  }),

  http.post('/api/profile/password', async ({ request }) => {
    await delay(160);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão expirada.');
    try {
      const body = (await request.json()) as { currentPassword: string; newPassword: string };
      if (!body.currentPassword || !body.newPassword) {
        return createError(400, 'validation_failed', 'Preencha os campos.', {
          currentPassword: !body.currentPassword ? 'obrigatório' : '',
          newPassword: !body.newPassword ? 'obrigatório' : '',
        });
      }
      if (body.newPassword.length < 6) {
        return createError(400, 'validation_failed', 'Senha muito curta.', {
          newPassword: 'mínimo 6 caracteres',
        });
      }
      if (body.currentPassword !== '123456') {
        throw new ApiErrorMock(401, 'unauthorized', 'Senha atual incorreta.', {
          currentPassword: 'incorreta',
        });
      }
      return new HttpResponse(null, { status: 204 });
    } catch (err) {
      if (err instanceof ApiErrorMock) {
        return createError(err.status, err.code, err.message, err.fields);
      }
      throw err;
    }
  }),

  http.post('/api/profile/avatar', async ({ request }) => {
    await delay(200);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão expirada.');
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'><circle cx='40' cy='40' r='40' fill='#E89D58'/><text x='40' y='52' text-anchor='middle' font-family='sans-serif' font-size='32' fill='#0E0905' font-weight='700'>${(user.displayName?.[0] ?? 'K').toUpperCase()}</text></svg>`,
    )}`;
    user.avatarUrl = dataUrl;
    return HttpResponse.json({ data: { url: dataUrl } });
  }),
];

export const debugUserHandlers = [
  http.get('/api/_debug/users', () => HttpResponse.json({ data: userFixtures })),
];