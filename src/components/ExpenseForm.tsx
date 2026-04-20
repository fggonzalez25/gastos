import React, { useState } from 'react';
import { Send, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  'comida',
  'expensas',
  'transporte',
  'supermercado',
  'gastos tarjeta',
  'internet',
  'servicios',
  'Salidas',
  'sueldo',
  'mercadolibre'
];

export default function ExpenseForm() {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    detail: '',
    category: 'comida',
    type: 'expense'
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.detail) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/add-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      if (!res.ok) throw new Error();
      
      setStatus('success');
      setFormData({
        ...formData,
        amount: '',
        detail: '',
      });
      
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-widest text-center md:text-left">Nueva Carga</h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase">Fecha</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-500 uppercase">Monto</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold pl-8 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-500 uppercase">Detalle del registro</label>
          <input
            type="text"
            placeholder="Ej: Supermercado Coto"
            value={formData.detail}
            onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase">Categoría</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat })}
                className={cn(
                  "px-3 py-2 text-[11px] rounded-lg border font-bold transition-all capitalize",
                  formData.category === cat
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-500 uppercase">Tipo de Operación</label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={cn(
                "flex-1 py-3 border rounded-xl text-sm font-bold transition-all",
                formData.type === 'expense' 
                  ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-100" 
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              Gasto (-)
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={cn(
                "flex-1 py-3 border rounded-xl text-sm font-bold transition-all",
                formData.type === 'income' 
                  ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-100" 
                  : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
              )}
            >
              Ingreso (+)
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            "w-full py-4 bg-indigo-600 text-white rounded-xl font-bold mt-2 shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95",
            status === 'loading' ? "bg-gray-400 opacity-50 cursor-not-allowed shadow-none" : "shadow-indigo-100 hover:bg-indigo-700"
          )}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Registrar Movimiento
            </>
          )}
        </button>

        <AnimatePresence>
          {status === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-50 border border-green-100 text-green-700 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold"
            >
              <CheckCircle2 className="w-5 h-5" />
              Movimiento registrado en Excel
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-3 text-sm font-semibold"
            >
              <AlertCircle className="w-5 h-5" />
              Error de conexión
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
