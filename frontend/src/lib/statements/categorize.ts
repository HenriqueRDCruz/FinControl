// Sugestões automáticas para cada lançamento do extrato. São só sugestões:
// o usuário revisa tudo na prévia antes de importar.

export function normalizeText(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .toUpperCase();
}

// Palavras curtas só casam inteiras ("BAR" não casa com "BARBEARIA"); as longas casam no início
// de uma palavra, porque os bancos colam textos ("SUPERMERCADOXYZ") — mas nunca no meio ("INTERNACIONAL").
function hasAny(text: string, words: string[]) {
  const padded = ` ${text} `;
  return words.some((w) => padded.includes(` ${w} `) || (w.length >= 6 && padded.includes(` ${w}`)));
}

const EXPENSE_RULES: Array<{ category: string; words: string[] }> = [
  // Marketplaces e meios de pagamento: "MERCADO LIVRE" não é supermercado
  { category: 'OTHER', words: ['MERCADO LIVRE', 'MERCADOLIVRE', 'MERCADO PAGO', 'MERCADOPAGO'] },
  { category: 'SUBSCRIPTIONS', words: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'PRIME VIDEO', 'DISNEY', 'HBO', 'YOUTUBE', 'GOOGLE ONE', 'ICLOUD', 'APPLE COM BILL', 'DEEZER', 'GLOBOPLAY', 'PARAMOUNT', 'CRUNCHYROLL', 'CHATGPT', 'OPENAI'] },
  { category: 'FOOD', words: ['IFOOD', 'RAPPI', 'MERCADO', 'SUPERMERCADO', 'PADARIA', 'RESTAURANTE', 'LANCHONETE', 'ACOUGUE', 'HORTIFRUTI', 'ATACADAO', 'ASSAI', 'CARREFOUR', 'ZAFFARI', 'PAO DE ACUCAR', 'LANCHES', 'PIZZARIA', 'PIZZA', 'BURGER', 'MCDONALDS', 'MC DONALDS', 'STARBUCKS', 'CAFE', 'SORVETERIA', 'BIG'] },
  { category: 'TRANSPORT', words: ['UBER', '99', '99POP', 'CABIFY', 'POSTO', 'COMBUSTIVEL', 'SHELL', 'IPIRANGA', 'ESTACIONAMENTO', 'PEDAGIO', 'SEM PARAR', 'CONECTCAR', 'ONIBUS', 'METRO', 'BILHETE', 'TRENSURB', 'PETROBRAS'] },
  { category: 'HEALTH', words: ['FARMACIA', 'DROGARIA', 'DROGA RAIA', 'RAIA', 'PAGUE MENOS', 'PANVEL', 'UNIMED', 'HOSPITAL', 'CLINICA', 'LABORATORIO', 'DENTISTA', 'ODONTO', 'SAUDE', 'PSICOLOGO', 'MEDICO'] },
  { category: 'EDUCATION', words: ['ESCOLA', 'COLEGIO', 'FACULDADE', 'UNIVERSIDADE', 'CURSO', 'UDEMY', 'ALURA', 'LIVRARIA', 'MENSALIDADE ESCOLAR', 'ESTACIO', 'UNISINOS'] },
  { category: 'LEISURE', words: ['CINEMA', 'INGRESSO', 'SYMPLA', 'SHOW', 'BAR', 'CERVEJARIA', 'VIAGEM', 'HOTEL', 'POUSADA', 'AIRBNB', 'BOOKING', 'DECOLAR', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO', 'LATAM', 'GOL', 'AZUL', 'ACADEMIA', 'SMARTFIT'] },
  { category: 'HOUSING', words: ['ALUGUEL', 'CONDOMINIO', 'ENERGIA', 'LUZ', 'CEEE', 'RGE', 'ENEL', 'CPFL', 'AGUA', 'CORSAN', 'SANEPAR', 'GAS', 'COMGAS', 'INTERNET', 'VIVO', 'CLARO', 'TIM', 'OI', 'NET', 'TELEFONE', 'IPTU', 'LEROY MERLIN', 'TELHANORTE'] },
  { category: 'TAXES', words: ['IMPOSTO', 'IPVA', 'DARF', 'DAS', 'TARIFA', 'IOF', 'TAXA', 'ANUIDADE', 'MULTA', 'LICENCIAMENTO', 'SEGURO'] },
];

export function suggestExpenseCategory(description: string): string {
  const text = normalizeText(description);
  for (const rule of EXPENSE_RULES) {
    if (hasAny(text, rule.words)) return rule.category;
  }
  return 'OTHER';
}

export function suggestIncomeSource(description: string): string {
  const text = normalizeText(description);
  if (hasAny(text, ['SALARIO', 'FOLHA', 'PAGTO SALARIO', 'PROVENTOS', 'ADIANTAMENTO SALARIAL', '13O SALARIO', 'FERIAS'])) return 'SALARY';
  if (hasAny(text, ['RENDIMENTO', 'DIVIDENDO', 'DIVIDENDOS', 'JUROS', 'JCP', 'PROVENTO', 'CDB', 'TESOURO', 'FII'])) return 'INVESTMENT_INCOME';
  if (hasAny(text, ['PRESENTE', 'DOACAO'])) return 'GIFT';
  return 'OTHER';
}

/**
 * Movimentações que não são renda nem gasto de verdade (pagar a própria fatura, aplicar e resgatar,
 * saldo). Vêm marcadas como "Ignorar" para não contar o mesmo dinheiro duas vezes.
 */
export function looksInternal(description: string): boolean {
  const text = normalizeText(description);
  return (
    /PAGAMENTO (DA |DE )?FATURA|PAGTO (DA |DE )?FATURA|FATURA CARTAO|PAGAMENTO RECEBIDO|PAGAMENTO EFETUADO|PAGAMENTO FATURA/.test(text) ||
    /^(APLICACAO|RESGATE|APLIC|RESG)\b|RESGATE RDB|APLICACAO RDB|RDB|CDB DI|POUPANCA/.test(text) ||
    /^SALDO\b|SALDO ANTERIOR|SALDO FINAL/.test(text)
  );
}
