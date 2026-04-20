import React, { useState, useEffect, useMemo } from 'react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Filter, Calendar, TrendingDown, TrendingUp, Wallet, Loader2, RefreshCw } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface Expense {
  date: string;
  detail: string;
  category: string;
  comida: number;
  expensas: number;
  transporte: number;
  supermercado: number;
  gastos_tarjeta: number;
  internet: number;
  servicios: number;
  salidas: number;
  sueldo: number;
  mercadolibre: number;
}

const COLORS = [
  '#4f46e5', // Super / Indigo
  '#fbbf24', // Servicios / Yellow
  '#f87171', // Salidas / Red
  '#94a3b8', // Otros / Slate
  '#10b981', // Sueldo / Emerald
  '#6366f1',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#8b5cf6'
];

const NECESSARY_CATEGORIES = ['expensas', 'transporte', 'supermercado', 'internet', 'servicios'];

export default function Summary() {
  const [data, setData] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const res = await fetch('/api/summary');
      const json = await res.json();
      if (Array.isArray(json)) {
        setData(json);
      } else {
        console.error('Expected array but received:', json);
        setData([]);
      }
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      try {
        let date: Date;
        // Handle different date formats (DD/MM/YYYY or YYYY-MM-DD or DD-MM)
        if (typeof item.date === 'string') {
          if (item.date.includes('/')) {
            const [d, m, y] = item.date.split('/');
            date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          } else {
            date = parseISO(item.date);
          }
        } else {
          date = new Date(item.date);
        }

        if (isNaN(date.getTime())) return false;

        return isWithinInterval(date, {
          start: parseISO(dateRange.start),
          end: parseISO(dateRange.end)
        });
      } catch (e) {
        return false;
      }
    });
  }, [data, dateRange]);

  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let necessary = 0;
    let unnecessary = 0;
    const byCategory: Record<string, number> = {};

    filteredData.forEach(item => {
      const itemTotalExpense = 
        item.comida + item.expensas + item.transporte + item.supermercado + 
        item.gastos_tarjeta + item.internet + item.servicios + item.salidas + 
        item.mercadolibre;
      
      const itemIncome = item.sueldo;

      if (itemIncome > 0) income += itemIncome;
      
      const absExpense = Math.abs(itemTotalExpense);
      expenses += absExpense;

      const cat = item.category;
      if (absExpense > 0) {
        byCategory[cat] = (byCategory[cat] || 0) + absExpense;
        
        if (NECESSARY_CATEGORIES.includes(cat)) {
          necessary += absExpense;
        } else {
          unnecessary += absExpense;
        }
      }
    });

    const chartData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

    return {
      income,
      expenses,
      balance: income - expenses,
      necessary,
      unnecessary,
      chartData
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-gray-300" />
        <p className="text-gray-500 font-bold uppercase text-[10px] tracking-widest">Sincronizando Resumen...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Stat & Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
           <div className="px-6 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-0.5">Balance del Mes</span>
            <span className={cn(
              "text-2xl font-black",
              stats.balance >= 0 ? "text-green-600" : "text-red-500"
            )}>
              {stats.balance >= 0 ? '+' : ''} ${stats.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="w-12 h-12 bg-white border border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Sincronizar con Excel"
          >
            <RefreshCw className={cn("w-5 h-5", refreshing && "animate-spin text-indigo-600")} />
          </button>
        </div>

        <div className="bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400 border-r border-gray-100 pr-4 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Filtro</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-indigo-100 outline-none cursor-pointer"
            />
            <span className="text-gray-300 text-xs">—</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1.5 rounded-lg border-none focus:ring-1 focus:ring-indigo-100 outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Gastos Necesarios</p>
          <p className="text-2xl font-black text-gray-800">${stats.necessary.toLocaleString('es-ES')}</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${stats.expenses > 0 ? (stats.necessary/stats.expenses)*100 : 0}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
             {stats.expenses > 0 ? Math.round((stats.necessary / stats.expenses) * 100) : 0}% del total de gastos
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Gastos Innecesarios</p>
          <p className="text-2xl font-black text-gray-800">${stats.unnecessary.toLocaleString('es-ES')}</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3">
            <div className="bg-orange-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${stats.expenses > 0 ? (stats.unnecessary/stats.expenses)*100 : 0}%` }}></div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 font-medium">
            {stats.expenses > 0 ? Math.round((stats.unnecessary / stats.expenses) * 100) : 0}% del total de gastos
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter mb-1">Ingresos Totales</p>
          <p className="text-2xl font-black text-green-600">${stats.income.toLocaleString('es-ES')}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] text-gray-400 italic">Sincronizado</span>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col items-center">
          <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest self-start mb-8 border-b border-gray-50 pb-2 w-full">Gastos por Categoría</h3>
          
          <div className="h-[280px] w-full relative flex items-center justify-center">
             {stats.chartData.length > 0 ? (
              <>
                <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-black text-gray-800">${Math.round(stats.expenses/1000)}k</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Total Gasto</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={stats.chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={85}
                      outerRadius={115}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(value: number) => [`$${value.toLocaleString()}`, 'Gasto']}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 font-medium italic text-sm">
                Sin movimientos cargados.
              </div>
            )}
          </div>

          <div className="w-full grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 mt-8 pt-8 border-t border-gray-50">
            {stats.chartData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="text-[11px] text-gray-500 font-bold uppercase truncate max-w-[80px]">{entry.name}</span>
                <span className="text-[11px] text-gray-400 ml-auto">{Math.round((entry.value/stats.expenses)*100)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-50 bg-gray-50/20">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Detalle Mensual</h3>
          </div>
          
          <div className="flex-grow overflow-auto max-h-[450px]">
            <table className="w-full text-left text-[11px]">
               <thead className="bg-gray-50/50 text-gray-400 uppercase font-bold sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Detalle</th>
                  <th className="px-6 py-3 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredData.length > 0 ? (
                  filteredData.sort((a, b) => b.date.localeCompare(a.date)).map((item, idx) => {
                    const amount = item.sueldo || (item.comida + item.expensas + item.transporte + item.supermercado + item.gastos_tarjeta + item.internet + item.servicios + item.salidas + item.mercadolibre);
                    return (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {(() => {
                            try {
                              let date: Date;
                              if (typeof item.date === 'string') {
                                if (item.date.includes('/')) {
                                  const [d, m, y] = item.date.split('/');
                                  date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                } else {
                                  date = parseISO(item.date);
                                }
                              } else {
                                date = new Date(item.date);
                              }
                              return format(date, 'dd MMM', { locale: es });
                            } catch (e) {
                              return item.date;
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800 truncate max-w-[150px]">
                          {item.detail}
                          <span className="block text-[9px] text-gray-400 uppercase tracking-tighter mt-0.5">{item.category}</span>
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-black",
                          amount >= 0 ? "text-green-600" : "text-red-500"
                        )}>
                          {amount >= 0 ? '+' : ''}${Math.abs(amount).toLocaleString('es-ES')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic">No hay registros en el archivo</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-indigo-600 text-white mt-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Capacidad de Ahorro</span>
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-black">
                {stats.income > 0 ? `${Math.round((stats.balance / stats.income) * 100)}%` : '0%'}
              </span>
              <span className="text-[10px] uppercase font-bold text-indigo-100">Sobre ingresos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
