'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertCircle,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  FileSpreadsheet,
  PieChart as PieIcon,
  CalendarRange,
  Sun,
  Moon,
  ChevronDown,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

interface Transaction {
  id: string;
  date: string;
  type: 'Entrada' | 'Saída';
  category: string;
  description: string;
  amount: number;
  status?: string;
  month?: string;
}

interface Summary {
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

// Paleta expandida de alta distinção e contraste cromático
const CATEGORY_COLORS: Record<string, string> = {
  Moradia: '#6366F1', // Indigo Elétrico
  Filho: '#EC4899', // Rosa Pink
  'Empréstimos': '#F59E0B', // Âmbar Dourado
  'Empréstimo': '#F59E0B',
  'EmprÃ©stimos': '#F59E0B',
  Moto: '#3B82F6', // Azul Real
  'Gastos Pessoal': '#8B5CF6', // Roxo Violeta
  'Alimentação': '#EA580C', // Laranja Queimado
  'Alimentacao': '#EA580C',
  Transporte: '#0284C7', // Azul Céu
  Saúde: '#E11D48', // Carmim / Rose
  'Saude': '#E11D48',
  Educação: '#7C3AED', // Púrpura Intenso
  'Educacao': '#7C3AED',
  Lazer: '#D946EF', // Fúcsia / Magenta
  Contas: '#F97316', // Laranja Vivo
  Investimentos: '#059669', // Esmeralda Escuro
  Vestuário: '#DB2777', // Rosa Escuro
  'Salário': '#10B981', // Verde Esmeralda
  'SalÃ¡rio': '#10B981',
  Entregas: '#14B8A6', // Verde Água / Teal
  'Saldo': '#06B6D4', // Ciano
  'Saldo ': '#06B6D4',
  Outros: '#0D9488', // Teal Oceânico
};

// Ampla gama com 24 cores harmonicamente selecionadas e sem repetição
const FALLBACK_PALETTE = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#E11D48', // Rose
  '#D946EF', // Fuchsia
  '#0284C7', // Sky Blue
  '#EA580C', // Deep Orange
  '#9333EA', // Purple
  '#059669', // Forest Emerald
  '#CA8A04', // Dark Yellow/Gold
  '#2563EB', // Cobalt Blue
  '#BE185D', // Magenta Dark
  '#4F46E5', // Ultramarine
  '#15803D', // Green
  '#C026D3', // Orchidea
  '#0891B2', // Cerulean
  '#EAB308', // Sun Yellow
];

function getCategoryColor(category: string, index?: number): string {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  const clean = category.trim();
  if (CATEGORY_COLORS[clean]) {
    return CATEGORY_COLORS[clean];
  }
  if (index !== undefined) {
    return FALLBACK_PALETTE[index % FALLBACK_PALETTE.length];
  }
  // Hash consistente para categorias desconhecidas
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[colorIndex];
}

const MONTH_NAMES_PT: Record<string, string> = {
  January: 'Janeiro',
  February: 'Fevereiro',
  March: 'Março',
  April: 'Abril',
  May: 'Maio',
  June: 'Junho',
  July: 'Julho',
  August: 'Agosto',
  September: 'Setembro',
  October: 'Outubro',
  November: 'Novembro',
  December: 'Dezembro',
};

function formatMonthLabel(monthKey: string) {
  if (monthKey === 'ALL') return 'Todos os Meses (Geral)';
  const [mName, year] = monthKey.split('/');
  const translated = MONTH_NAMES_PT[mName] || mName;
  return year ? `${translated} / ${year}` : translated;
}

export default function Dashboard() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('December/2026');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<{ name: string; value: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Entrada' | 'Saída'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Realizado' | 'Previsto'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Inicializar tema com base na preferência salva no localStorage ou preferência do sistema
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const fetchData = async (monthToFetch?: string) => {
    try {
      setRefreshing(true);
      const targetMonth = monthToFetch !== undefined ? monthToFetch : selectedMonth;
      const res = await fetch(`/api/finance?month=${encodeURIComponent(targetMonth)}`);
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
        setTransactions(data.transactions);
        setExpenseByCategory(data.expenseByCategory);
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth);
  }, [selectedMonth]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const list = transactions.filter((tx) => {
      const matchesSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'ALL' || tx.type === filterType;
      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'Realizado' && tx.status?.trim().toLowerCase() === 'realizado') ||
        (filterStatus === 'Previsto' && tx.status?.trim().toLowerCase() !== 'realizado');
      const matchesCategory = selectedCategory === 'ALL' || tx.category === selectedCategory;
      return matchesSearch && matchesType && matchesStatus && matchesCategory;
    });

    // Garantir ordenação: Entradas sempre primeiro, e depois cronológico
    return list.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'Entrada' ? -1 : 1;
      }
      const [d1, m1, y1] = a.date.split('/').map(Number);
      const [d2, m2, y2] = b.date.split('/').map(Number);
      const t1 = new Date(y1 || 2026, (m1 || 12) - 1, d1 || 1).getTime();
      const t2 = new Date(y2 || 2026, (m2 || 12) - 1, d2 || 1).getTime();
      return t1 - t2;
    });
  }, [transactions, searchTerm, filterType, filterStatus, selectedCategory]);

  const timelineData = useMemo(() => {
    const map: Record<string, { date: string; Entrada: number; Saída: number }> = {};
    transactions.forEach((tx) => {
      if (!map[tx.date]) {
        map[tx.date] = { date: tx.date.slice(0, 5), Entrada: 0, Saída: 0 };
      }
      if (tx.type === 'Entrada') {
        map[tx.date].Entrada += tx.amount;
      } else {
        map[tx.date].Saída += tx.amount;
      }
    });
    return Object.values(map);
  }, [transactions]);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const isLight = theme === 'light';

  if (loading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 ${
          isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-white'
        }`}
      >
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Carregando dados da sua planilha do Google...
        </p>
      </div>
    );
  }

  const sm = summary?.sheetMetrics;
  const availableMonths = summary?.availableMonths || ['November/2026', 'December/2026', 'January/2027', 'February/2027'];

  return (
    <div
      className={`min-h-screen transition-colors duration-200 p-4 sm:p-6 lg:p-8 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Header */}
      <header
        className={`max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between pb-6 border-b gap-4 transition-colors duration-200 ${
          isLight ? 'border-slate-200' : 'border-slate-800'
        }`}
      >
        <div>
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isLight
                  ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  : 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30'
              }`}
            >
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h1
                className={`text-2xl sm:text-3xl font-bold ${
                  isLight
                    ? 'text-slate-900'
                    : 'bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent'
                }`}
              >
                Controle Financeiro
              </h1>
              <p
                className={`text-sm flex items-center gap-2 mt-0.5 ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                <Calendar className="w-4 h-4 text-indigo-500" />
                Mês ativo: <strong className="font-semibold">{formatMonthLabel(selectedMonth)}</strong> • Google Sheets Sincronizado
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Mês */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className={`appearance-none pl-4 pr-10 py-2 rounded-lg text-sm font-medium border cursor-pointer transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                  : 'bg-slate-900 border-slate-700/80 text-slate-200 hover:bg-slate-850'
              }`}
              title="Selecione o mês"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                  📅 {formatMonthLabel(m)}
                </option>
              ))}
              <option value="ALL" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>
                📊 Todos os Meses (Geral)
              </option>
            </select>
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            />
          </div>

          {/* Botão Alternar Light / Dark Mode */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition shadow-sm active:scale-95 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            title={isLight ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
          >
            {isLight ? (
              <>
                <Moon className="w-4 h-4 text-indigo-600" />
                <span className="hidden sm:inline">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light Mode</span>
              </>
            )}
          </button>

          {/* Abrir Planilha */}
          <a
            href="https://docs.google.com/spreadsheets/d/1HXSVSwyey5_EhfmvFcDB9a7X9y1bcdaOgqLP2TDuNSQ/edit"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-medium transition ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            Abrir Planilha
          </a>

          {/* Botão Atualizar */}
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Painel do Mês */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2
              className={`text-sm font-semibold uppercase tracking-wider ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              Visão do Mês ({formatMonthLabel(selectedMonth)})
            </h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full border ${
                isLight
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              Calculado em Tempo Real
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total de Entradas com Barra de Progresso de Recebido */}
            <div
              className={`rounded-2xl p-5 border shadow-sm transition ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-slate-200/50'
                  : 'bg-slate-900/60 backdrop-blur border-slate-800/80 hover:border-emerald-500/40'
              }`}
            >
              <div
                className={`flex items-center justify-between ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <span className="text-sm font-medium">Total de Entradas</span>
                <div
                  className={`p-2 rounded-lg ${
                    isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className={`text-2xl font-bold truncate ${
                      isLight ? 'text-emerald-600' : 'text-emerald-400'
                    }`}
                  >
                    {formatBRL(summary?.totalIncome ?? 0)}
                  </h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    (summary?.paidIncomePercent ?? 0) === 100
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : isLight
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {summary?.paidIncomePercent ?? 0}% rec.
                  </span>
                </div>

                {/* Barra de Progresso Recebido vs Pendente */}
                <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, summary?.paidIncomePercent ?? 0)}%` }}
                    title={`Recebido: ${formatBRL(summary?.paidIncome ?? 0)}`}
                  />
                  <div
                    className="bg-amber-500/60 h-full transition-all duration-500 flex-1"
                    title={`A Receber: ${formatBRL(summary?.pendingIncome ?? 0)}`}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] gap-1">
                  <span className={`flex items-center gap-1 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span>Rec:</span>
                    <strong className="text-emerald-500 truncate">{formatBRL(summary?.paidIncome ?? 0)}</strong>
                  </span>
                  <span className={`flex items-center gap-1 truncate justify-end ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span>Pend:</span>
                    <strong className="text-amber-500 truncate">{formatBRL(summary?.pendingIncome ?? 0)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Saídas do Mês com Barra de Progresso de Pago */}
            <div
              className={`rounded-2xl p-5 border shadow-sm transition ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-rose-500/50 shadow-slate-200/50'
                  : 'bg-slate-900/60 backdrop-blur border-slate-800/80 hover:border-rose-500/40'
              }`}
            >
              <div
                className={`flex items-center justify-between ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <span className="text-sm font-medium">Saídas do Mês</span>
                <div
                  className={`p-2 rounded-lg ${
                    isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3
                    className={`text-2xl font-bold truncate ${
                      isLight ? 'text-rose-600' : 'text-rose-400'
                    }`}
                  >
                    {formatBRL(summary?.totalExpense ?? 0)}
                  </h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    (summary?.paidExpensePercent ?? 0) === 100
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : isLight
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {summary?.paidExpensePercent ?? 0}% pago
                  </span>
                </div>

                {/* Barra de Progresso Pago vs Pendente */}
                <div className="mt-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, summary?.paidExpensePercent ?? 0)}%` }}
                    title={`Pago: ${formatBRL(summary?.paidExpense ?? 0)}`}
                  />
                  <div
                    className="bg-amber-500/60 h-full transition-all duration-500 flex-1"
                    title={`Pendente: ${formatBRL(summary?.pendingExpense ?? 0)}`}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] gap-1">
                  <span className={`flex items-center gap-1 truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span>Pago:</span>
                    <strong className="text-emerald-500 truncate">{formatBRL(summary?.paidExpense ?? 0)}</strong>
                  </span>
                  <span className={`flex items-center gap-1 truncate justify-end ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Clock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    <span>Pend:</span>
                    <strong className="text-amber-500 truncate">{formatBRL(summary?.pendingExpense ?? 0)}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Saldo do Mês */}
            <div
              className={`rounded-2xl p-5 border shadow-sm transition ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-indigo-500/50 shadow-slate-200/50'
                  : 'bg-slate-900/60 backdrop-blur border-slate-800/80 hover:border-indigo-500/40'
              }`}
            >
              <div
                className={`flex items-center justify-between ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <span className="text-sm font-medium">Saldo do Mês</span>
                <div
                  className={`p-2 rounded-lg ${
                    isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'
                  }`}
                >
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <h3
                  className={`text-2xl font-bold ${
                    isLight ? 'text-indigo-600' : 'text-indigo-400'
                  }`}
                >
                  {formatBRL(summary?.balance ?? 0)}
                </h3>
                <p
                  className={`text-xs mt-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Taxa de poupança:{' '}
                  <span
                    className={`font-semibold ${
                      isLight ? 'text-slate-800' : 'text-slate-200'
                    }`}
                  >
                    {summary?.savingsRate}%
                  </span>
                </p>
              </div>
            </div>

            {/* Maior Categoria de Saída */}
            <div
              className={`rounded-2xl p-5 border shadow-sm transition ${
                isLight
                  ? 'bg-white border-slate-200 hover:border-slate-300 shadow-slate-200/50'
                  : 'bg-slate-900/60 backdrop-blur border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div
                className={`flex items-center justify-between ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                <span className="text-sm font-medium">Maior Categoria</span>
                <div
                  className="p-2 rounded-lg"
                  style={{
                    backgroundColor: `${getCategoryColor(summary?.topCategory.name || '')}1A`,
                    color: getCategoryColor(summary?.topCategory.name || ''),
                  }}
                >
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getCategoryColor(summary?.topCategory.name || '') }}
                  />
                  <h3
                    className="text-2xl font-bold truncate"
                    style={{ color: getCategoryColor(summary?.topCategory.name || '') }}
                  >
                    {summary?.topCategory.name || '-'}
                  </h3>
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Total:{' '}
                  <span
                    className={`font-semibold ${
                      isLight ? 'text-slate-800' : 'text-slate-200'
                    }`}
                  >
                    {formatBRL(summary?.topCategory.amount || 0)}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo Acumulado do Ano */}
        {sm && (
          <div>
            <h2
              className={`text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              <CalendarRange className="w-4 h-4 text-indigo-500" />
              Visão Acumulada do Ano (Planilha)
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                className={`rounded-xl p-4 border transition ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Saídas no Ano</span>
                <p className={`text-lg font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {formatBRL(sm.yearExpenses)}
                </p>
              </div>

              <div
                className={`rounded-xl p-4 border transition ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Saldo do Ano</span>
                <p className={`text-lg font-bold mt-1 ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                  {formatBRL(sm.yearBalance)}
                </p>
              </div>

              <div
                className={`rounded-xl p-4 border transition ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Média de Saídas / Mês</span>
                <p className={`text-lg font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  {formatBRL(sm.yearAvgMonthlyExpense)}
                </p>
              </div>

              <div
                className={`rounded-xl p-4 border transition ${
                  isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900/40 border-slate-800/80'
                }`}
              >
                <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Taxa de Poupança no Ano</span>
                <p className={`text-lg font-bold mt-1 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                  {sm.yearSavingsRate}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Donut de Despesas por Categoria */}
          <div
            className={`rounded-2xl p-6 border shadow-sm transition ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50'
                : 'bg-slate-900/60 backdrop-blur border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Despesas por Categoria
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Distribuição percentual dos gastos no período
                </p>
              </div>
              <Layers className="w-5 h-5 text-indigo-500" />
            </div>

            {/* Gráfico com Legendas na Esquerda e Donut maior na Direita */}
            {expenseByCategory.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                Sem despesas registradas neste período
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Legendas na Esquerda */}
                <div className="w-full sm:w-1/2 flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                  {(() => {
                    const totalVal = expenseByCategory.reduce((sum, item) => sum + item.value, 0);
                    return expenseByCategory.map((cat, idx) => {
                      const color = getCategoryColor(cat.name, idx);
                      const percent = totalVal > 0 ? ((cat.value / totalVal) * 100).toFixed(1) : '0';
                      return (
                        <div
                          key={cat.name}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isLight
                              ? 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                              : 'bg-slate-950/40 hover:bg-slate-800/60 border-slate-800/80'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: color }}
                            />
                            <span
                              className={`text-sm font-medium truncate ${
                                isLight ? 'text-slate-800' : 'text-slate-200'
                              }`}
                              title={cat.name}
                            >
                              {cat.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                                isLight
                                  ? 'bg-white text-slate-700 border border-slate-200'
                                  : 'bg-slate-900 text-slate-300 border border-slate-700/60'
                              }`}
                            >
                              {percent}%
                            </span>
                            <span
                              className="text-xs font-semibold"
                              style={{ color }}
                            >
                              {formatBRL(cat.value)}
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Donut Chart na Direita preenchendo melhor */}
                <div className="w-full sm:w-1/2 h-72 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {expenseByCategory.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getCategoryColor(entry.name, index)}
                            stroke={isLight ? '#ffffff' : '#0f172a'}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatBRL(Number(value)), 'Valor']}
                        contentStyle={{
                          backgroundColor: isLight ? '#ffffff' : '#0f172a',
                          borderColor: isLight ? '#e2e8f0' : '#334155',
                          borderRadius: '8px',
                          color: isLight ? '#0f172a' : '#fff',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de Barras por Data */}
          <div
            className={`rounded-2xl p-6 border shadow-sm transition ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50'
                : 'bg-slate-900/60 backdrop-blur border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  Fluxo de Entradas vs Saídas
                </h2>
                <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Movimentações por data registrada
                </p>
              </div>
              <PiggyBank className="w-5 h-5 text-emerald-500" />
            </div>

            <div className="h-64 w-full">
              {timelineData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Nenhum lançamento no período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isLight ? '#e2e8f0' : '#1e293b'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      stroke={isLight ? '#94a3b8' : '#64748b'}
                      tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis
                      stroke={isLight ? '#94a3b8' : '#64748b'}
                      tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }}
                      tickFormatter={(val) => `R$${val}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatBRL(Number(value)), '']}
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#e2e8f0' : '#334155',
                        borderRadius: '8px',
                        color: isLight ? '#0f172a' : '#fff',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Entrada" fill="#10B981" radius={[4, 4, 0, 0]} name="Entradas" />
                    <Bar dataKey="Saída" fill="#F43F5E" radius={[4, 4, 0, 0]} name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div
          className={`rounded-2xl overflow-hidden border shadow-sm transition ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-200/50'
              : 'bg-slate-900/60 backdrop-blur border-slate-800/80'
          }`}
        >
          <div
            className={`p-5 border-b flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${
              isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800/80 bg-slate-950/20'
            }`}
          >
            <div>
              <h2 className={`text-lg font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                Lançamentos Detalhados
              </h2>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Histórico de transações para {formatMonthLabel(selectedMonth)} ({filteredTransactions.length} lançamentos)
              </p>
            </div>

            {/* Controles de Filtro e Busca */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search
                  className={`w-4 h-4 absolute left-3 top-3 ${
                    isLight ? 'text-slate-400' : 'text-slate-400'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-lg pl-9 pr-4 py-1.5 text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-indigo-500'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 placeholder-slate-500 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* Filtro Tipo (Menu Cascata / Select) com Entradas sempre primeiro */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'ALL' | 'Entrada' | 'Saída')}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 hover:bg-slate-900'
                  }`}
                  title="Filtrar por tipo"
                >
                  <option value="Entrada">🟢 Entradas</option>
                  <option value="Saída">🔴 Saídas</option>
                  <option value="ALL">⚪ Todos os tipos</option>
                </select>
                <ChevronDown
                  className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                />
              </div>

              {/* Filtro Status (Pago vs Pendente) */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'Realizado' | 'Previsto')}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 hover:bg-slate-900'
                  }`}
                  title="Filtrar por status de pagamento"
                >
                  <option value="ALL">Status: Todos</option>
                  <option value="Realizado">✓ Pago / Recebido</option>
                  <option value="Previsto">⏳ Pendente</option>
                </select>
                <ChevronDown
                  className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                />
              </div>

              {/* Filtro Categoria */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <option value="ALL">Todas as categorias</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full text-left text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <thead
                className={`uppercase text-xs border-b ${
                  isLight
                    ? 'bg-slate-100/70 text-slate-600 border-slate-200'
                    : 'bg-slate-950/50 text-slate-400 border-slate-800'
                }`}
              >
                <tr>
                  <th className="px-6 py-3.5">Data</th>
                  <th className="px-6 py-3.5">Descrição</th>
                  <th className="px-6 py-3.5">Categoria</th>
                  <th className="px-6 py-3.5">Tipo</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className={`px-6 py-8 text-center ${isLight ? 'text-slate-500' : 'text-slate-500'}`}
                    >
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPaid = tx.status?.trim().toLowerCase() === 'realizado';
                    return (
                      <tr
                        key={tx.id}
                        className={`transition ${
                          isLight
                            ? isPaid
                              ? 'hover:bg-slate-50/80'
                              : 'bg-amber-500/[0.02] hover:bg-amber-500/[0.05]'
                            : isPaid
                            ? 'hover:bg-slate-800/40'
                            : 'bg-amber-500/[0.02] hover:bg-slate-800/50'
                        }`}
                      >
                        <td
                          className={`px-6 py-4 whitespace-nowrap font-mono text-xs ${
                            isLight ? 'text-slate-500' : 'text-slate-400'
                          }`}
                        >
                          {tx.date}
                        </td>
                        <td className={`px-6 py-4 font-medium ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {tx.description}
                        </td>
                        <td className="px-6 py-4">
                          {(() => {
                            const catColor = getCategoryColor(tx.category);
                            return (
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                                style={{
                                  backgroundColor: isLight ? `${catColor}15` : `${catColor}20`,
                                  color: catColor,
                                  borderColor: `${catColor}40`,
                                }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: catColor }}
                                />
                                {tx.category}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              tx.type === 'Entrada'
                                ? isLight
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : isLight
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {tx.type === 'Entrada' ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            {tx.type}
                          </span>
                        </td>
                        {/* Coluna Status */}
                        <td className="px-6 py-4">
                          {isPaid ? (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                isLight
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              }`}
                              title="Confirmado como Realizado na planilha"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {tx.type === 'Entrada' ? 'Recebido' : 'Pago'}
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                isLight
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              }`}
                              title="Previsto na planilha (Ainda não liquidado)"
                            >
                              <Clock className="w-3.5 h-3.5 text-amber-500" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${
                            tx.type === 'Entrada'
                              ? isLight
                                ? 'text-emerald-600'
                                : 'text-emerald-400'
                              : isLight
                              ? 'text-rose-600'
                              : 'text-rose-400'
                          }`}
                        >
                          {tx.type === 'Entrada' ? '+ ' : '- '}
                          {formatBRL(tx.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
