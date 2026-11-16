'use client';

import React, { useEffect, useState } from 'react';
import { getFinanceData, Summary } from '@/lib/financeService';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function WidgetPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (force = false) => {
    try {
      setRefreshing(true);
      const data = await getFinanceData('December/2026', force);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto refresh a cada 5 minutos
    const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#0B0F19] text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
        <p className="text-xs text-slate-400 font-medium">Carregando métricas...</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#07090E] p-3 sm:p-4 flex flex-col justify-center items-center font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Widget Card Container */}
      <div className="w-full max-w-sm rounded-[28px] p-5 bg-gradient-to-b from-[#111827] via-[#0F172A] to-[#0B0F19] border border-slate-800/90 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow de fundo */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold tracking-tight text-white block leading-tight">
                FinDash Pro
              </span>
              <span className="text-[10px] text-slate-400 block leading-tight">
                Dezembro / 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition active:scale-95 disabled:opacity-50"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 transition active:scale-95"
              title="Abrir Dashboard Completo"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Saldo Principal */}
        <div className="rounded-2xl p-4 bg-slate-900/80 border border-slate-800/80 mb-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Saldo Restante
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              Poupança: {summary?.savingsRate}%
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-white font-mono tabular-nums">
              {formatBRL(summary?.balance ?? 0)}
            </h2>
          </div>
        </div>

        {/* Grid Entradas vs Saídas */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Entradas */}
          <div className="rounded-2xl p-3 bg-slate-900/50 border border-slate-800/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider">Entradas</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-base font-extrabold text-emerald-400 font-mono tabular-nums leading-tight">
              {formatBRL(summary?.totalIncome ?? 0)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {summary?.paidIncomePercent}%
              </span>
              <span>{formatBRL(summary?.paidIncome ?? 0)}</span>
            </div>
          </div>

          {/* Saídas */}
          <div className="rounded-2xl p-3 bg-slate-900/50 border border-slate-800/70">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider">Saídas</span>
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-base font-extrabold text-rose-400 font-mono tabular-nums leading-tight">
              {formatBRL(summary?.totalExpense ?? 0)}
            </p>
            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span className="flex items-center gap-1 text-rose-500">
                <Clock className="w-2.5 h-2.5 text-amber-500" />
                {summary?.paidExpensePercent}%
              </span>
              <span>{formatBRL(summary?.paidExpense ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Rodapé interativo */}
        <a
          href="/"
          className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-xs font-semibold py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition active:scale-98"
        >
          <span>Abrir Dashboard Completo</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
