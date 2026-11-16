'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getFinanceData, Transaction, Summary } from '@/lib/financeService';
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
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Download,
  Sparkles,
  ArrowRight,
  Filter,
  ShieldCheck,
  Target,
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
  Saúde: '#10B981', // Verde Esmeralda
  'Saude': '#10B981',
  Lazer: '#06B6D4', // Ciano
  Educação: '#84CC16', // Lima
  'Educacao': '#84CC16',
  Investimentos: '#14B8A6', // Teal
  Assinaturas: '#A855F7', // Púrpura Claro
  Roupas: '#F43F5E', // Rose
  Contas: '#64748B', // Cinza Azulado
  Geral: '#94A3B8', // Cinza Claro
  Salário: '#10B981',
  'Salario': '#10B981',
  Renda: '#22C55E',
};

const FALLBACK_PALETTE = [
  '#6366F1',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#06B6D4',
  '#84CC16',
  '#D946EF',
  '#0284C7',
  '#EA580C',
  '#9333EA',
  '#059669',
  '#CA8A04',
  '#2563EB',
  '#BE185D',
  '#4F46E5',
  '#15803D',
  '#C026D3',
  '#0891B2',
  '#EAB308',
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
  // Caso venha em português
  janeiro: 'Janeiro',
  fevereiro: 'Fevereiro',
  marco: 'Março',
  'março': 'Março',
  abril: 'Abril',
  maio: 'Maio',
  junho: 'Junho',
  julho: 'Julho',
  agosto: 'Agosto',
  setembro: 'Setembro',
  outubro: 'Outubro',
  novembro: 'Novembro',
  dezembro: 'Dezembro',
};

function formatMonthLabel(monthStr: string): string {
  if (monthStr === 'ALL') return 'Todos os Meses (Geral)';
  const [mName, year] = monthStr.split('/');
  const lowerName = (mName || '').toLowerCase();
  const ptMonth =
    MONTH_NAMES_PT[mName] ||
    MONTH_NAMES_PT[lowerName] ||
    (mName ? mName.charAt(0).toUpperCase() + mName.slice(1) : '');
  return year ? `${ptMonth} de ${year}` : ptMonth;
}

export default function FinanceDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenseByCategory, setExpenseByCategory] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [hideValues, setHideValues] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'Entrada' | 'Saída'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'Realizado' | 'Previsto'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Inicializar preferências do localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }

    const savedHideValues = localStorage.getItem('hideValues');
    if (savedHideValues !== null) {
      setHideValues(savedHideValues === 'true');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const toggleHideValues = () => {
    const nextVal = !hideValues;
    setHideValues(nextVal);
    localStorage.setItem('hideValues', String(nextVal));
  };

  const fetchData = async (monthToFetch?: string, forceRefresh = false) => {
    try {
      setRefreshing(true);
      const targetMonth = monthToFetch !== undefined ? monthToFetch : selectedMonth;
      const data = await getFinanceData(targetMonth, forceRefresh);
      if (data.summary) {
        setSummary(data.summary);
        setTransactions(data.transactions);
        setExpenseByCategory(data.expenseByCategory);
        if (!selectedMonth && data.summary.selectedMonth) {
          setSelectedMonth(data.summary.selectedMonth);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(selectedMonth || undefined);
  }, [selectedMonth]);

  const availableMonths = useMemo(() => {
    return summary?.availableMonths || [];
  }, [summary]);

  // Navegação rápida de mês
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    } else if (idx === -1 && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx !== -1 && idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    }
  };

  const currentMonthIndex = availableMonths.indexOf(selectedMonth);
  const canGoPrev = currentMonthIndex > 0;
  const canGoNext = currentMonthIndex !== -1 && currentMonthIndex < availableMonths.length - 1;

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
    if (hideValues) return 'R$ ••••••';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const exportCSV = () => {
    if (!filteredTransactions.length) return;
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Valor (R$)'];
    const rows = filteredTransactions.map((tx) => [
      `"${tx.date}"`,
      `"${tx.description.replace(/"/g, '""')}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      `"${tx.type}"`,
      `"${tx.status?.trim().toLowerCase() === 'realizado' ? (tx.type === 'Entrada' ? 'Recebido' : 'Pago') : 'Pendente'}"`,
      tx.amount.toFixed(2),
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `finance_${selectedMonth.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLight = theme === 'light';
  const sm = summary?.sheetMetrics;

  if (loading) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center transition-colors duration-200 ${
          isLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-950 text-white'
        }`}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 flex items-center justify-center animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        </div>
        <p className="mt-4 text-sm font-medium tracking-wide text-slate-400">
          Carregando inteligência financeira...
        </p>
      </div>
    );
  }

  const totalExpenseVal = expenseByCategory.reduce((sum, item) => sum + item.value, 0);

  return (
    <div
      className={`min-h-screen transition-colors duration-200 p-4 sm:p-6 lg:p-8 font-sans ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0B0F19] text-slate-100'
      }`}
    >
      {/* Top Navbar Glass Header */}
      <header
        className={`max-w-7xl mx-auto rounded-3xl p-4 sm:p-5 border backdrop-blur-xl transition-all duration-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sticky top-4 z-40 ${
          isLight
            ? 'bg-white/90 border-slate-200/90 shadow-slate-200/50'
            : 'bg-slate-900/80 border-slate-800/80 shadow-black/40'
        }`}
      >
        {/* Identidade da Marca & Status */}
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <PieIcon className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 ring-2 ring-slate-900" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                FinDash Pro
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Static SSG
              </span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Mês ativo: <strong className="font-semibold text-slate-300">{formatMonthLabel(selectedMonth)}</strong>
            </p>
          </div>
        </div>

        {/* Controles de Ação do Header */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full md:w-auto justify-end">
          {/* Seletor Rápido de Mês com Setas */}
          <div
            className={`flex items-center rounded-xl border p-1 ${
              isLight ? 'bg-slate-100/80 border-slate-300' : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <button
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              className={`p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight ? 'hover:bg-white text-slate-700' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className={`appearance-none pl-3 pr-7 py-1 text-xs font-semibold bg-transparent cursor-pointer focus:outline-none ${
                  isLight ? 'text-slate-800' : 'text-slate-200'
                }`}
                title="Selecione o mês"
              >
                {availableMonths.map((m) => (
                  <option
                    key={m}
                    value={m}
                    className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}
                  >
                    {formatMonthLabel(m)}
                  </option>
                ))}
                <option
                  value="ALL"
                  className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}
                >
                  Todos os Meses (Geral)
                </option>
              </select>
              <ChevronDown
                className={`w-3.5 h-3.5 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              />
            </div>

            <button
              onClick={handleNextMonth}
              disabled={!canGoNext}
              className={`p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight ? 'hover:bg-white text-slate-700' : 'hover:bg-slate-800 text-slate-300'
              }`}
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botão Modo Privacidade (Ocultar Valores) */}
          <button
            onClick={toggleHideValues}
            className={`p-2 rounded-xl border text-sm transition shadow-sm active:scale-95 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title={hideValues ? 'Mostrar valores monetários' : 'Ocultar valores monetários (Modo Privacidade)'}
          >
            {hideValues ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4" />}
          </button>

          {/* Botão Alternar Light / Dark Mode */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border text-sm transition shadow-sm active:scale-95 ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
            title={isLight ? 'Ativar Modo Escuro' : 'Ativar Modo Claro'}
          >
            {isLight ? <Moon className="w-4 h-4 text-indigo-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Abrir Planilha Google */}
          <a
            href="https://docs.google.com/spreadsheets/d/1HXSVSwyey5_EhfmvFcDB9a7X9y1bcdaOgqLP2TDuNSQ/edit"
            target="_blank"
            rel="noreferrer"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition ${
              isLight
                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Planilha</span>
          </a>

          {/* Botão Atualizar */}
          <button
            onClick={() => fetchData(selectedMonth, true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/25 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Buscando...' : 'Atualizar'}</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-7xl mx-auto mt-6 space-y-6">
        {/* Banner de Resumo Inteligente / Insights */}
        <div
          className={`rounded-2xl p-4 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            isLight
              ? 'bg-gradient-to-r from-indigo-50 via-white to-purple-50 border-indigo-100 text-slate-800'
              : 'bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-purple-950/40 border-indigo-900/30 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Diagnóstico do Período
              </p>
              <p className="text-sm font-medium mt-0.5">
                {(summary?.balance ?? 0) >= 0 ? (
                  <>
                    Superávit de <strong className="text-emerald-400 font-bold">{formatBRL(summary?.balance ?? 0)}</strong> com taxa de poupança em{' '}
                    <strong className="text-emerald-400 font-bold">{summary?.savingsRate}%</strong>.
                  </>
                ) : (
                  <>
                    Déficit financeiro de <strong className="text-rose-400 font-bold">{formatBRL(summary?.balance ?? 0)}</strong>. Atenção aos gastos pendentes!
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900/40 border border-slate-700/50">
            <span>Status das Despesas:</span>
            <span className="text-emerald-400">{summary?.paidExpensePercent}% Pago</span>
          </div>
        </div>

        {/* Grid de KPIs do Mês */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Entradas */}
          <div
            className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isLight
                ? 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-slate-200/40'
                : 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-emerald-500/40 shadow-black/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Entradas
              </span>
              <div
                className={`p-2 rounded-xl ${
                  isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={`text-2xl font-black tracking-tight tabular-nums ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                  {formatBRL(summary?.totalIncome ?? 0)}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {summary?.paidIncomePercent ?? 0}% rec.
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary?.paidIncomePercent ?? 0)}%` }}
                />
                <div className="bg-amber-500/50 h-full flex-1" />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] gap-1 font-mono">
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span>{formatBRL(summary?.paidIncome ?? 0)}</span>
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{formatBRL(summary?.pendingIncome ?? 0)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card Saídas */}
          <div
            className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isLight
                ? 'bg-white border-slate-200 hover:border-rose-500/50 shadow-slate-200/40'
                : 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-rose-500/40 shadow-black/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Saídas do Mês
              </span>
              <div
                className={`p-2 rounded-xl ${
                  isLight ? 'bg-rose-50 text-rose-600' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={`text-2xl font-black tracking-tight tabular-nums ${isLight ? 'text-rose-600' : 'text-rose-400'}`}>
                  {formatBRL(summary?.totalExpense ?? 0)}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {summary?.paidExpensePercent ?? 0}% pago
                </span>
              </div>

              {/* Barra de Progresso */}
              <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary?.paidExpensePercent ?? 0)}%` }}
                />
                <div className="bg-amber-500/50 h-full flex-1" />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] gap-1 font-mono">
                <span className="flex items-center gap-1 text-emerald-500">
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                  <span>{formatBRL(summary?.paidExpense ?? 0)}</span>
                </span>
                <span className="flex items-center gap-1 text-amber-500">
                  <Clock className="w-3 h-3 flex-shrink-0" />
                  <span>{formatBRL(summary?.pendingExpense ?? 0)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Card Saldo */}
          <div
            className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isLight
                ? 'bg-white border-slate-200 hover:border-indigo-500/50 shadow-slate-200/40'
                : 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-indigo-500/40 shadow-black/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Saldo Restante
              </span>
              <div
                className={`p-2 rounded-xl ${
                  isLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <h3 className={`text-2xl font-black tracking-tight tabular-nums ${isLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
                {formatBRL(summary?.balance ?? 0)}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-400">Poupança:</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {summary?.savingsRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Card Reserva de Emergência */}
          <div
            className={`rounded-2xl p-5 border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              isLight
                ? 'bg-white border-slate-200 hover:border-emerald-500/50 shadow-slate-200/40'
                : 'bg-gradient-to-b from-slate-900/90 to-slate-900/50 backdrop-blur-md border-slate-800/80 hover:border-emerald-500/40 shadow-black/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Reserva de Emergência
              </span>
              <div
                className={`p-2 rounded-xl ${
                  isLight ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className={`text-2xl font-black tracking-tight tabular-nums ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                  {formatBRL(summary?.reserve?.current ?? 0)}
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {summary?.reserve?.progressPercent ?? 0}% da meta
                </span>
              </div>

              {/* Barra de Progresso no mesmo estilo */}
              <div className="mt-3 w-full bg-slate-200 dark:bg-slate-800/80 rounded-full h-1.5 overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary?.reserve?.progressPercent ?? 0)}%` }}
                />
                <div className="bg-emerald-500/20 h-full flex-1" />
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[11px] gap-1 font-mono">
                <span className="flex items-center gap-1 text-slate-400">
                  <Target className="w-3 h-3 flex-shrink-0 text-emerald-500" />
                  <span>Meta: {formatBRL(summary?.reserve?.target ?? 0)}</span>
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span>Falta: {formatBRL(summary?.reserve?.remaining ?? 0)}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumo Anual Acumulado (Oficial da Planilha) */}
        {sm && (
          <div
            className={`rounded-2xl p-5 border transition ${
              isLight
                ? 'bg-white border-slate-200 shadow-sm'
                : 'bg-slate-900/40 backdrop-blur border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-400">
                <CalendarRange className="w-4 h-4" />
                Métricas Consolidadas no Ano
              </h2>
              <span className="text-[11px] text-slate-500">Base oficial da aba Painel Resumo</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                <span className="text-xs text-slate-400">Saídas Acumuladas</span>
                <p className="text-lg font-black tracking-tight mt-1 text-rose-400 tabular-nums font-mono">
                  {formatBRL(sm.yearExpenses)}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                <span className="text-xs text-slate-400">Saldo no Ano</span>
                <p className="text-lg font-black tracking-tight mt-1 text-indigo-400 tabular-nums font-mono">
                  {formatBRL(sm.yearBalance)}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                <span className="text-xs text-slate-400">Média Mensal de Gastos</span>
                <p className="text-lg font-black tracking-tight mt-1 text-slate-200 tabular-nums font-mono">
                  {formatBRL(sm.yearAvgMonthlyExpense)}
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
                <span className="text-xs text-slate-400">Poupança Média Anual</span>
                <p className="text-lg font-black tracking-tight mt-1 text-emerald-400 tabular-nums">
                  {sm.yearSavingsRate}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Gráficos em Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico Donut com Informação Central */}
          <div
            className={`rounded-2xl p-6 border shadow-sm transition ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-slate-900/60 backdrop-blur border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">Despesas por Categoria</h2>
                <p className="text-xs text-slate-400">Distribuição proporcional dos gastos</p>
              </div>
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>

            {expenseByCategory.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-slate-500">
                Nenhuma despesa para exibir neste período.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                {/* Legendas com porcentagem */}
                <div className="w-full sm:w-1/2 flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
                  {expenseByCategory.map((cat, idx) => {
                    const color = getCategoryColor(cat.name, idx);
                    const percent = totalExpenseVal > 0 ? ((cat.value / totalExpenseVal) * 100).toFixed(1) : '0';
                    return (
                      <div
                        key={cat.name}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                          isLight
                            ? 'bg-slate-50/80 border-slate-200 hover:bg-slate-100'
                            : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs font-medium truncate">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-slate-400 text-[11px]">{percent}%</span>
                          <span className="font-semibold">{formatBRL(cat.value)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Donut Chart com Centro Informativo */}
                <div className="w-full sm:w-1/2 h-72 relative flex items-center justify-center">
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none z-10">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Gasto</span>
                    <span className="text-sm font-black font-mono tracking-tight text-slate-200">
                      {formatBRL(totalExpenseVal)}
                    </span>
                  </div>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expenseByCategory}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={3}
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
                          borderRadius: '12px',
                          color: isLight ? '#0f172a' : '#fff',
                          boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.3)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Gráfico de Barras com Visual Moderno */}
          <div
            className={`rounded-2xl p-6 border shadow-sm transition ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-slate-900/60 backdrop-blur border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold">Fluxo Diário</h2>
                <p className="text-xs text-slate-400">Entradas vs Saídas registradas por dia</p>
              </div>
              <PiggyBank className="w-5 h-5 text-emerald-400" />
            </div>

            {timelineData.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-sm text-slate-500">
                Sem histórico cronológico no mês.
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#f1f5f9' : '#1e293b'} vertical={false} />
                    <XAxis
                      dataKey="date"
                      stroke={isLight ? '#94a3b8' : '#64748b'}
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={isLight ? '#94a3b8' : '#64748b'}
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `R$${v}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatBRL(Number(value)), 'Valor']}
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#e2e8f0' : '#334155',
                        borderRadius: '12px',
                        color: isLight ? '#0f172a' : '#fff',
                        boxShadow: '0 8px 16px -2px rgb(0 0 0 / 0.3)',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Entrada" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Saída" fill="#F43F5E" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de Lançamentos com Exportação e Filtros Completos */}
        <div
          className={`rounded-2xl overflow-hidden border shadow-sm transition ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-slate-900/60 backdrop-blur border-slate-800/80'
          }`}
        >
          {/* Header da Tabela com Botão de Exportação */}
          <div
            className={`p-5 border-b flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${
              isLight ? 'border-slate-200 bg-slate-50/50' : 'border-slate-800/80 bg-slate-950/20'
            }`}
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Lançamentos Detalhados</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  {filteredTransactions.length}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Histórico completo com filtros por categoria, status e texto
              </p>
            </div>

            {/* Controles de Filtro e Botão de Download CSV */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar lançamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs transition focus:outline-none focus:ring-2 focus:ring-indigo-500 border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 placeholder-slate-500'
                  }`}
                />
              </div>

              {/* Filtro Tipo */}
              <div className="relative">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as 'ALL' | 'Entrada' | 'Saída')}
                  className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <option value="ALL">Tipo: Todos</option>
                  <option value="Entrada">🟢 Entradas</option>
                  <option value="Saída">🔴 Saídas</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>

              {/* Filtro Status */}
              <div className="relative">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as 'ALL' | 'Realizado' | 'Previsto')}
                  className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <option value="ALL">Status: Todos</option>
                  <option value="Realizado">✓ Pago / Recebido</option>
                  <option value="Previsto">⏳ Pendente</option>
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>

              {/* Filtro Categoria */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={`appearance-none pl-3 pr-7 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                      : 'bg-slate-950 border-slate-700/80 text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <option value="ALL">Categoria: Todas</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>

              {/* Botão Exportar CSV */}
              <button
                onClick={exportCSV}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition active:scale-95 shadow-sm ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-950 border-slate-700/80 text-slate-300 hover:bg-slate-900'
                }`}
                title="Exportar lançamentos filtrados em CSV"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Tabela Responsiva com Tabular Nums */}
          <div className="overflow-x-auto">
            <table className={`w-full text-left text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <thead
                className={`uppercase text-[11px] tracking-wider border-b ${
                  isLight
                    ? 'bg-slate-100/70 text-slate-500 border-slate-200'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800'
                }`}
              >
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Data</th>
                  <th className="px-5 py-3.5 font-semibold">Descrição</th>
                  <th className="px-5 py-3.5 font-semibold">Categoria</th>
                  <th className="px-5 py-3.5 font-semibold">Tipo</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/60'}`}>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500 text-sm">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isPaid = tx.status?.trim().toLowerCase() === 'realizado';
                    const catColor = getCategoryColor(tx.category);

                    return (
                      <tr
                        key={tx.id}
                        className={`transition ${
                          isLight
                            ? 'hover:bg-slate-50/80'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-slate-400">
                          {tx.date}
                        </td>
                        <td className={`px-5 py-3.5 font-medium ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
                          {tx.description}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border"
                            style={{
                              backgroundColor: isLight ? `${catColor}15` : `${catColor}20`,
                              color: catColor,
                              borderColor: `${catColor}35`,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: catColor }} />
                            {tx.category}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                              tx.type === 'Entrada'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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
                        <td className="px-5 py-3.5">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {tx.type === 'Entrada' ? 'Recebido' : 'Pago'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <Clock className="w-3 h-3 text-amber-400" />
                              Pendente
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-5 py-3.5 text-right font-black whitespace-nowrap font-mono tabular-nums ${
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
