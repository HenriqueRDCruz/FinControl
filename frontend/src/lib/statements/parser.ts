// Leitura de extratos bancários (OFX e CSV). Funções puras: sem acesso a DOM nem à rede.

export interface ParsedEntry {
  /** AAAA-MM-DD */
  date: string;
  description: string;
  /** Com o sinal do arquivo: negativo = saiu da conta, positivo = entrou (débito/crédito já aplicados) */
  amount: number;
}

export interface ParseResult {
  format: 'ofx' | 'csv';
  entries: ParsedEntry[];
  /** Linhas do arquivo que não deu para entender (cabeçalhos, totais, linhas quebradas) */
  ignoredLines: number;
}

// ---------- texto ----------

/** Bancos brasileiros ainda exportam em Windows-1252: tenta UTF-8 e cai para ele se houver bytes inválidos. */
export function decodeBytes(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

function normalizeHeader(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function cleanDescription(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

// ---------- datas e valores ----------

function isRealDate(y: number, m: number, d: number) {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m: RegExpMatchArray | null;
  let y: number, mo: number, d: number;

  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) {
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/))) {
    [d, mo, y] = [Number(m[1]), Number(m[2]), 2000 + Number(m[3])];
  } else if ((m = s.match(/^(\d{4})(\d{2})(\d{2})/))) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else {
    return null;
  }
  return isRealDate(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
}

/**
 * Converte "1.234,56", "-R$ 1.234,56", "1234.56", "(45,90)", "45,90-" ou "45,90 D" em número.
 * `dotIsDecimal`: em OFX o ponto é sempre decimal ("1.234" = 1,234).
 */
export function parseAmount(raw: string, dotIsDecimal = false): number | null {
  let s = raw.trim();
  if (!s) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  const marker = s.match(/^(.*?)\s*([DC])$/i); // "45,90 D" (débito) / "45,90 C" (crédito)
  if (marker && /\d/.test(marker[1])) {
    if (marker[2].toUpperCase() === 'D') negative = true;
    s = marker[1];
  }
  s = s.replace(/R\$|\s/gi, '');
  if (s.endsWith('-')) {
    negative = true;
    s = s.slice(0, -1);
  }
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }
  s = s.replace(/[^\d.,]/g, '');
  if (!/\d/.test(s)) return null;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let decimal: ',' | '.' | null = null;

  if (lastComma >= 0 && lastDot >= 0) {
    decimal = lastComma > lastDot ? ',' : '.';
  } else if (lastComma >= 0) {
    decimal = ',';
  } else if (lastDot >= 0) {
    const looksLikeThousands = /^\d{1,3}(\.\d{3})+$/.test(s);
    decimal = dotIsDecimal || !looksLikeThousands ? '.' : null;
  }

  let normalized = s;
  if (decimal === ',') normalized = s.replace(/\./g, '').replace(',', '.');
  else if (decimal === '.') normalized = s.replace(/,/g, '');
  else normalized = s.replace(/[.,]/g, '');

  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

// ---------- OFX ----------

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function parseOfx(text: string): ParseResult {
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const entries: ParsedEntry[] = [];
  let ignoredLines = 0;

  for (const block of blocks) {
    const end = block.search(/<\/STMTTRN>/i);
    const body = end >= 0 ? block.slice(0, end) : block;
    // OFX 1.x (SGML) não fecha as tags; OFX 2.x (XML) fecha. Esta leitura serve para os dois.
    const tag = (name: string) => {
      const m = body.match(new RegExp(`<${name}>\\s*([^<\\r\\n]*)`, 'i'));
      return m ? decodeEntities(m[1]).trim() : '';
    };

    const date = parseDate(tag('DTPOSTED'));
    const amount = parseAmount(tag('TRNAMT'), true);
    const description = cleanDescription(tag('MEMO') || tag('NAME'));

    if (!date || amount === null || amount === 0) {
      ignoredLines++;
      continue;
    }
    entries.push({ date, amount, description: description || '(sem descrição)' });
  }

  return { format: 'ofx', entries, ignoredLines };
}

// ---------- CSV ----------

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells.map((c) => c.trim());
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 15);
  let best = ';';
  let bestScore = -1;
  for (const delimiter of [';', ',', '\t']) {
    // Pontua pelos delimitadores que aparecem de forma consistente nas linhas
    const counts = sample.map((l) => splitCsvLine(l, delimiter).length - 1).filter((n) => n > 0);
    const score = counts.length * Math.min(...counts, 99);
    if (score > bestScore) {
      best = delimiter;
      bestScore = score;
    }
  }
  return best;
}

interface Columns {
  date: number;
  description: number;
  amount: number;
  debit: number;
  credit: number;
}

function findColumns(header: string[]): Columns | null {
  const h = header.map(normalizeHeader);
  const find = (re: RegExp, skip: number[] = []) => h.findIndex((c, i) => !skip.includes(i) && re.test(c));

  const date = find(/\bDATA\b|\bDATE\b|^DT\b/);
  if (date < 0) return null;
  const description = find(/DESCRICAO|HISTORICO|LANCAMENTO|MEMO|ESTABELECIMENTO|TITLE|TITULO|DETALHE|DESCRIPTION|NOME/, [date]);
  const amount = find(/VALOR|AMOUNT|QUANTIA|MONTANTE/, [date, description]);
  const debit = find(/DEBITO|SAIDA|DEBIT/, [date, description, amount]);
  const credit = find(/CREDITO|ENTRADA|CREDIT/, [date, description, amount, debit]);

  if (amount < 0 && (debit < 0 || credit < 0)) return null;
  if (description < 0) return null;
  return { date, description, amount, debit, credit };
}

/** Sem cabeçalho reconhecível: adivinha as colunas olhando os dados. */
function inferColumns(rows: string[][]): Columns | null {
  const width = Math.max(...rows.map((r) => r.length));
  const sample = rows.slice(0, 30);
  const score = (col: number, test: (v: string) => boolean) =>
    sample.filter((r) => r[col] !== undefined && test(r[col])).length;

  let date = -1;
  let amount = -1;
  let bestDate = 0;
  let bestAmount = 0;
  for (let c = 0; c < width; c++) {
    const d = score(c, (v) => parseDate(v) !== null);
    if (d > bestDate) [date, bestDate] = [c, d];
  }
  for (let c = 0; c < width; c++) {
    if (c === date) continue;
    const a = score(c, (v) => /\d/.test(v) && /^[-+()R$\s\d.,DC]+-?$/i.test(v.trim()) && parseAmount(v) !== null);
    if (a > bestAmount) [amount, bestAmount] = [c, a];
  }
  if (date < 0 || amount < 0) return null;

  let description = -1;
  let bestLen = 0;
  for (let c = 0; c < width; c++) {
    if (c === date || c === amount) continue;
    const len = sample.reduce((sum, r) => sum + (r[c]?.length ?? 0), 0);
    if (len > bestLen) [description, bestLen] = [c, len];
  }
  if (description < 0) return null;
  return { date, description, amount, debit: -1, credit: -1 };
}

function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { format: 'csv', entries: [], ignoredLines: 0 };

  const delimiter = detectDelimiter(lines);
  const rows = lines.map((l) => splitCsvLine(l, delimiter));

  // Procura o cabeçalho nas primeiras linhas (muitos bancos colocam dados da conta antes)
  let headerIndex = -1;
  let columns: Columns | null = null;
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const found = findColumns(rows[i]);
    if (found) {
      headerIndex = i;
      columns = found;
      break;
    }
  }
  if (!columns) {
    columns = inferColumns(rows);
    headerIndex = -1;
  }
  if (!columns) return { format: 'csv', entries: [], ignoredLines: rows.length };

  const entries: ParsedEntry[] = [];
  let ignoredLines = headerIndex + 1;

  for (const row of rows.slice(headerIndex + 1)) {
    const date = parseDate(row[columns.date] ?? '');
    if (!date) {
      ignoredLines++;
      continue;
    }

    let amount: number | null = null;
    if (columns.amount >= 0) {
      amount = parseAmount(row[columns.amount] ?? '');
    } else {
      const debit = parseAmount(row[columns.debit] ?? '');
      const credit = parseAmount(row[columns.credit] ?? '');
      if (debit) amount = -Math.abs(debit);
      else if (credit) amount = Math.abs(credit);
    }

    const description = cleanDescription(row[columns.description] ?? '');
    if (amount === null || amount === 0 || /^SALDO( |$)/.test(normalizeHeader(description))) {
      ignoredLines++;
      continue;
    }
    entries.push({ date, amount, description: description || '(sem descrição)' });
  }

  return { format: 'csv', entries, ignoredLines };
}

// ---------- entrada principal ----------

export function parseStatement(text: string): ParseResult {
  return /<STMTTRN>/i.test(text) ? parseOfx(text) : parseCsv(text);
}
