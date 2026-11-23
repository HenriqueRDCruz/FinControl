import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuotesService } from '../quotes.service';

const apiPayload = {
  USDBRL: { bid: '5.4321', pctChange: '-0.29' },
  EURBRL: { bid: '6.1050', pctChange: '0.41' },
  BTCBRL: { bid: '512000.5', pctChange: '1.2' },
};

function okResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe('QuotesService', () => {
  let service: QuotesService;
  let fetchMock: jest.SpyInstance;
  let config: { get: jest.Mock };

  beforeEach(() => {
    config = { get: jest.fn().mockReturnValue(undefined) };
    service = new QuotesService(config as unknown as ConfigService);
    fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(okResponse(apiPayload));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('converte a resposta da AwesomeAPI para números em reais', async () => {
    const result = await service.getQuotes();

    expect(result.base).toBe('BRL');
    expect(result.stale).toBe(false);
    expect(result.items).toEqual([
      { code: 'USD', name: 'Dólar americano', bid: 5.4321, pctChange: -0.29 },
      { code: 'EUR', name: 'Euro', bid: 6.105, pctChange: 0.41 },
      { code: 'BTC', name: 'Bitcoin', bid: 512000.5, pctChange: 1.2 },
    ]);
    expect(fetchMock.mock.calls[0][0]).toContain('USD-BRL,EUR-BRL,BTC-BRL');
  });

  it('usa cache: duas consultas seguidas geram uma única chamada externa', async () => {
    await service.getQuotes();
    await service.getQuotes();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('consultas simultâneas compartilham a mesma chamada externa', async () => {
    await Promise.all([service.getQuotes(), service.getQuotes(), service.getQuotes()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('envia a chave da API quando AWESOMEAPI_KEY está configurada', async () => {
    config.get.mockReturnValue('minha-chave');
    await service.getQuotes();
    const options = fetchMock.mock.calls[0][1] as { headers: Record<string, string> };
    expect(options.headers['x-api-key']).toBe('minha-chave');
  });

  it('ignora moedas com valor inválido e mantém as demais', async () => {
    fetchMock.mockResolvedValue(
      okResponse({ USDBRL: { bid: '5.40', pctChange: '0.1' }, EURBRL: { bid: 'abc' } }),
    );
    const result = await service.getQuotes();
    expect(result.items.map((i) => i.code)).toEqual(['USD']);
  });

  it('devolve a última cotação (stale) quando a API falha depois do cache expirar', async () => {
    const realNow = Date.now();
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(realNow);
    await service.getQuotes();

    nowSpy.mockReturnValue(realNow + 6 * 60 * 1000); // cache vencido
    fetchMock.mockRejectedValue(new Error('timeout'));

    const result = await service.getQuotes();
    expect(result.stale).toBe(true);
    expect(result.items).toHaveLength(3);
  });

  it('responde 503 quando a API falha e não há cotação guardada', async () => {
    fetchMock.mockRejectedValue(new Error('rede fora do ar'));
    await expect(service.getQuotes()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('responde 503 quando a API retorna erro HTTP', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: async () => ({}) } as Response);
    await expect(service.getQuotes()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
