import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Quote {
  code: string;
  name: string;
  /** Preço de compra em reais (BRL) */
  bid: number;
  /** Variação percentual no dia */
  pctChange: number;
}

export interface QuotesResponse {
  base: 'BRL';
  /** Quando a cotação foi consultada na API externa (ISO 8601) */
  updatedAt: string;
  /** true quando a API externa falhou e estamos devolvendo a última cotação guardada */
  stale: boolean;
  items: Quote[];
}

const API_URL = 'https://economia.awesomeapi.com.br/json/last';
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;

const CURRENCIES = [
  { code: 'USD', name: 'Dólar americano' },
  { code: 'EUR', name: 'Euro' },
  { code: 'BTC', name: 'Bitcoin' },
];

/**
 * Integração com a AwesomeAPI (cotações em reais).
 * - Cache de 5 minutos: poucas chamadas externas, resposta rápida e sem estourar limites.
 * - Se a API cair, devolve a última cotação guardada (stale) em vez de quebrar o dashboard.
 * - Chave opcional em AWESOMEAPI_KEY (libera cotações sem cache da API).
 */
@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private cache: { data: QuotesResponse; fetchedAt: number } | null = null;
  private inflight: Promise<QuotesResponse> | null = null;

  constructor(private readonly config: ConfigService) {}

  async getQuotes(): Promise<QuotesResponse> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.data;
    }

    try {
      // Várias requisições simultâneas compartilham uma única chamada externa.
      this.inflight ??= this.fetchFromApi().finally(() => {
        this.inflight = null;
      });
      const data = await this.inflight;
      this.cache = { data, fetchedAt: Date.now() };
      return data;
    } catch (error) {
      this.logger.warn(`Falha ao consultar cotações: ${(error as Error).message}`);
      if (this.cache) {
        return { ...this.cache.data, stale: true };
      }
      throw new ServiceUnavailableException('Cotações indisponíveis no momento.');
    }
  }

  private async fetchFromApi(): Promise<QuotesResponse> {
    const pairs = CURRENCIES.map((c) => `${c.code}-BRL`).join(',');
    const headers: Record<string, string> = { Accept: 'application/json' };
    const apiKey = this.config.get<string>('AWESOMEAPI_KEY');
    if (apiKey) headers['x-api-key'] = apiKey;

    const response = await fetch(`${API_URL}/${pairs}`, {
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`AwesomeAPI respondeu ${response.status}`);
    }

    const payload = (await response.json()) as Record<string, { bid?: string; pctChange?: string }>;

    const items: Quote[] = [];
    for (const { code, name } of CURRENCIES) {
      const raw = payload[`${code}BRL`];
      const bid = Number(raw?.bid);
      const pctChange = Number(raw?.pctChange);
      if (!Number.isFinite(bid) || bid <= 0) continue;
      items.push({ code, name, bid, pctChange: Number.isFinite(pctChange) ? pctChange : 0 });
    }

    if (items.length === 0) {
      throw new Error('Resposta da AwesomeAPI sem cotações válidas');
    }

    return { base: 'BRL', updatedAt: new Date().toISOString(), stale: false, items };
  }
}
