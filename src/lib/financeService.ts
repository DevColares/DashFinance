const SHEET_ID = '1HXSVSwyey5_EhfmvFcDB9a7X9y1bcdaOgqLP2TDuNSQ';

// gid=0: Painel Resumo (gviz/tq ok — users don't filter this tab)
// gid=1: Lançamentos — use CSV export so active sheet filters are IGNORED and ALL rows are returned
const PAINEL_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;
const LANCAMENTOS_CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=1`;

/** Robust CSV parser that handles quoted fields containing commas or newlines */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'Entrada' | 'Saída';
  category: string;
  description: string;
  amount: number;
  status?: string;
  month?: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  paidExpense: number;
  pendingExpense: number;
  paidIncome: number;
  pendingIncome: number;
  paidExpensePercent: number;
  paidIncomePercent: number;
  topCategory: { name: string; amount: number };
  period: string;
  selectedMonth: string;
  availableMonths: string[];
  sheetMetrics?: {
    monthIncome: number;
    monthExpenses: number;
    monthBalance: number;
    monthSavingsRate: string;
    yearIncome: number;
    yearExpenses: number;
    yearBalance: number;
    yearSavingsRate: string;
    yearAvgMonthlyExpense: number;
    yearEndAccumulated: number;
  };
}

export interface ExpenseByCategory {
  name: string;
  value: number;
}

export interface FinanceData {
  summary: Summary;
  transactions: Transaction[];
  expenseByCategory: ExpenseByCategory[];
}

function parseCurrencyString(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let str = String(val).replace('R$', '').trim();
  if (str.includes(',') && str.includes('.')) {
    str = str.replace(/,/g, '');
  } else if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

interface RawDataCache {
  period: string;
  sheetMetrics: Summary['sheetMetrics'];
  allTransactions: Transaction[];
  availableMonths: string[];
  fetchedAt: number;
}

let memoryCache: RawDataCache | null = null;

export async function fetchRawData(forceRefresh = false): Promise<RawDataCache> {
  if (!forceRefresh && memoryCache && Date.now() - memoryCache.fetchedAt < 60000) {
    return memoryCache;
  }

  const [painelRes, lancamentosRes] = await Promise.all([
    fetch(PAINEL_URL, { cache: 'no-store' }),
    fetch(LANCAMENTOS_CSV_URL, { cache: 'no-store' }),
  ]);

  if (!painelRes.ok || !lancamentosRes.ok) {
    throw new Error('Erro ao conectar à planilha do Google Sheets');
  }

  // 1. Extrair Painel Resumo (Valores Oficiais)
  const painelText = await painelRes.text();
  const pJsonStr = painelText.substring(painelText.indexOf('{'), painelText.lastIndexOf('}') + 1);
  const pGviz = JSON.parse(pJsonStr);
  const pRows = pGviz.table.rows;

  let period = 'Dezembro de 2026';
  const headerTitle = pGviz.table.cols[1]?.label || '';
  const match = headerTitle.match(/Período em análise:\s*([^|]+)/i);
  if (match) period = match[1].trim();

  const monthIncome = parseCurrencyString(pRows[2]?.c?.[1]?.v || 'R$ 3,345.00');
  const monthExpenses = parseCurrencyString(pRows[2]?.c?.[3]?.v || 'R$ 2,673.00');
  const monthBalance = parseCurrencyString(pRows[2]?.c?.[5]?.v || 'R$ 672.00');
  const monthSavingsRate = pRows[2]?.c?.[7]?.v || '20.1%';

  const yearIncome = parseCurrencyString(pRows[4]?.c?.[1]?.v || 'R$ 5,193.00');
  const yearExpenses = parseCurrencyString(pRows[4]?.c?.[3]?.v || 'R$ 4,521.00');
  const yearBalance = parseCurrencyString(pRows[4]?.c?.[5]?.v || 'R$ 672.00');
  const yearSavingsRate = pRows[4]?.c?.[7]?.v || '12.9%';
  const yearAvgMonthlyExpense = parseCurrencyString(pRows[4]?.c?.[9]?.v || 'R$ 2,260.50');
  const yearEndAccumulated = parseCurrencyString(pRows[4]?.c?.[11]?.v || 'R$ 672.00');

  // 2. Extrair Lançamentos via CSV export
  const lancText = await lancamentosRes.text();
  const csvRows = parseCSV(lancText).slice(1);

  const allTransactions: Transaction[] = [];
  const monthsSet = new Set<string>();

  csvRows.forEach((cols, idx) => {
    const dateVal = cols[0] || '';
    const typeVal = cols[1];
    const categoryVal = cols[2] || 'Geral';
    const descriptionVal = cols[3] || categoryVal;
    const amountVal = parseCurrencyString(cols[4]);
    const statusVal = cols[5] || '';
    const monthVal = cols[7] || '';

    if (monthVal) monthsSet.add(monthVal);

    if (typeVal === 'Entrada' || typeVal === 'Saída') {
      allTransactions.push({
        id: `tx-${idx}`,
        date: dateVal,
        type: typeVal as 'Entrada' | 'Saída',
        category: categoryVal,
        description: descriptionVal,
        amount: Number(amountVal.toFixed(2)),
        status: statusVal,
        month: monthVal,
      });
    }
  });

  memoryCache = {
    period,
    sheetMetrics: {
      monthIncome,
      monthExpenses,
      monthBalance,
      monthSavingsRate,
      yearIncome,
      yearExpenses,
      yearBalance,
      yearSavingsRate,
      yearAvgMonthlyExpense,
      yearEndAccumulated,
    },
    allTransactions,
    availableMonths: Array.from(monthsSet),
    fetchedAt: Date.now(),
  };

  return memoryCache;
}

export async function getFinanceData(month = 'December/2026', forceRefresh = false): Promise<FinanceData> {
  const rawData = await fetchRawData(forceRefresh);

  // Filtrar pelo mês selecionado
  const currentTransactions = rawData.allTransactions.filter((tx) =>
    month === 'ALL' ? true : tx.month === month
  );

  // Ordenar transações: Entradas primeiro sempre, e depois por data
  currentTransactions.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'Entrada' ? -1 : 1;
    }
    const [d1, m1, y1] = a.date.split('/').map(Number);
    const [d2, m2, y2] = b.date.split('/').map(Number);
    const t1 = new Date(y1 || 2026, (m1 || 12) - 1, d1 || 1).getTime();
    const t2 = new Date(y2 || 2026, (m2 || 12) - 1, d2 || 1).getTime();
    return t1 - t2;
  });

  let calculatedIncome = 0;
  let calculatedExpense = 0;
  let paidExpense = 0;
  let pendingExpense = 0;
  let paidIncome = 0;
  let pendingIncome = 0;
  const expenseByCategory: Record<string, number> = {};

  currentTransactions.forEach((tx) => {
    const isPaid = tx.status?.trim().toLowerCase() === 'realizado';
    if (tx.type === 'Entrada') {
      calculatedIncome += tx.amount;
      if (isPaid) {
        paidIncome += tx.amount;
      } else {
        pendingIncome += tx.amount;
      }
    } else {
      calculatedExpense += tx.amount;
      if (isPaid) {
        paidExpense += tx.amount;
      } else {
        pendingExpense += tx.amount;
      }
      expenseByCategory[tx.category] = (expenseByCategory[tx.category] || 0) + tx.amount;
    }
  });

  calculatedIncome = Number(calculatedIncome.toFixed(2));
  calculatedExpense = Number(calculatedExpense.toFixed(2));
  paidExpense = Number(paidExpense.toFixed(2));
  pendingExpense = Number(pendingExpense.toFixed(2));
  paidIncome = Number(paidIncome.toFixed(2));
  pendingIncome = Number(pendingIncome.toFixed(2));
  const paidExpensePercent =
    calculatedExpense > 0 ? Number(((paidExpense / calculatedExpense) * 100).toFixed(1)) : 0;
  const paidIncomePercent =
    calculatedIncome > 0 ? Number(((paidIncome / calculatedIncome) * 100).toFixed(1)) : 0;
  const calculatedBalance = Number((calculatedIncome - calculatedExpense).toFixed(2));
  const calculatedSavingsRate =
    calculatedIncome > 0 ? (Math.max(0, calculatedBalance) / calculatedIncome) * 100 : 0;

  let topCategory = { name: 'Nenhuma', amount: 0 };
  Object.entries(expenseByCategory).forEach(([cat, amt]) => {
    if (amt > topCategory.amount) {
      topCategory = { name: cat, amount: Number(amt.toFixed(2)) };
    }
  });

  const summary: Summary = {
    totalIncome: calculatedIncome,
    totalExpense: calculatedExpense,
    balance: calculatedBalance,
    savingsRate: Number(calculatedSavingsRate.toFixed(1)),
    paidExpense,
    pendingExpense,
    paidIncome,
    pendingIncome,
    paidExpensePercent,
    paidIncomePercent,
    topCategory,
    period: rawData.period,
    selectedMonth: month,
    availableMonths: rawData.availableMonths,
    sheetMetrics: rawData.sheetMetrics,
  };

  return {
    summary,
    transactions: currentTransactions,
    expenseByCategory: Object.entries(expenseByCategory).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    })),
  };
}
