import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MailService } from '../mail.service';

function makeService(env: Record<string, string | undefined>) {
  const config = { get: jest.fn((key: string) => env[key]) };
  return new MailService(config as unknown as ConfigService);
}

const configured = {
  BREVO_API_KEY: 'chave-secreta',
  MAIL_FROM: 'remetente@exemplo.com',
  FRONTEND_URL: 'https://fincontrol.exemplo.app/',
  NODE_ENV: 'production',
};

describe('MailService', () => {
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 201, text: async () => '' } as Response);
  });

  afterEach(() => jest.restoreAllMocks());

  it('envia a redefinição de senha pela API da Brevo com o link do frontend e o token', async () => {
    await makeService(configured).sendPasswordReset('ana@exemplo.com', 'abc123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.headers['api-key']).toBe('chave-secreta');

    const body = JSON.parse(options.body);
    expect(body.sender).toEqual({ name: 'FinControl', email: 'remetente@exemplo.com' });
    expect(body.to).toEqual([{ email: 'ana@exemplo.com' }]);
    expect(body.subject).toContain('Redefinição de senha');
    // sem barra duplicada mesmo com FRONTEND_URL terminando em "/"
    expect(body.htmlContent).toContain('https://fincontrol.exemplo.app/reset-password?token=abc123');
    expect(body.textContent).toContain('https://fincontrol.exemplo.app/reset-password?token=abc123');
  });

  it('envia a verificação de e-mail com o link correto', async () => {
    await makeService(configured).sendEmailVerification('ana@exemplo.com', 'tok999');
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.htmlContent).toContain('https://fincontrol.exemplo.app/verify-email?token=tok999');
  });

  it('sem provedor configurado, em desenvolvimento mostra o link no log e não chama a API', async () => {
    const log = jest.spyOn(Logger.prototype, 'log');
    await makeService({ NODE_ENV: 'development' }).sendPasswordReset('ana@exemplo.com', 'abc123');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('http://localhost:3000/reset-password?token=abc123'));
  });

  it('sem provedor configurado, em produção avisa e NÃO escreve o token no log', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn');
    const log = jest.spyOn(Logger.prototype, 'log');
    await makeService({ NODE_ENV: 'production' }).sendPasswordReset('ana@exemplo.com', 'segredo-do-token');

    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('BREVO_API_KEY'));
    const everything = JSON.stringify([...warn.mock.calls, ...log.mock.calls]);
    expect(everything).not.toContain('segredo-do-token');
  });

  it('se a Brevo recusar o envio, não lança erro (só registra)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Key not found' } as Response);
    await expect(makeService(configured).sendPasswordReset('ana@exemplo.com', 'abc')).resolves.toBeUndefined();
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('401'));
  });

  it('se a rede falhar, não lança erro', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    await expect(makeService(configured).sendEmailVerification('ana@exemplo.com', 'abc')).resolves.toBeUndefined();
  });

  it('não grava o e-mail completo do destinatário nos logs de produção', async () => {
    await makeService(configured).sendPasswordReset('ana.silva@exemplo.com', 'abc');
    const logged = JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls);
    expect(logged).not.toContain('ana.silva@exemplo.com');
    expect(logged).toContain('a***@exemplo.com');
  });

  it('em 401 orienta a gerar uma chave de API e reiniciar o backend', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Key not found' } as Response);
    await makeService(configured).sendPasswordReset('ana@exemplo.com', 'abc');
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('reinicie o backend'));
  });

  it('em 401 com chave de SMTP avisa que é preciso uma chave de API', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'Key not found' } as Response);
    await makeService({ ...configured, BREVO_API_KEY: 'xsmtpsib-abc' }).sendPasswordReset('ana@exemplo.com', 'abc');
    expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('chave de SMTP'));
  });

  it('remove espaços e quebras de linha da chave antes de enviar', async () => {
    await makeService({ ...configured, BREVO_API_KEY: '  chave-limpa \n' }).sendPasswordReset('ana@exemplo.com', 'abc');
    const options = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(options.headers['api-key']).toBe('chave-limpa');
  });

  it('desembrulha a chave quando a Brevo entrega o valor em base64 ({"api_key": ...})', async () => {
    const wrapped = Buffer.from(JSON.stringify({ api_key: 'xkeysib-interna-123' })).toString('base64');
    await makeService({ ...configured, BREVO_API_KEY: wrapped }).sendPasswordReset('ana@exemplo.com', 'abc');
    const options = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(options.headers['api-key']).toBe('xkeysib-interna-123');
  });

  it('aceita a chave com aspas ao redor', async () => {
    await makeService({ ...configured, BREVO_API_KEY: '"xkeysib-abc"' }).sendPasswordReset('ana@exemplo.com', 'abc');
    const options = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(options.headers['api-key']).toBe('xkeysib-abc');
  });
});
