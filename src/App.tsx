import React, { useState, useEffect } from 'react';
import { LogIn, LogOut, PlusCircle, PieChart, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

import ExpenseForm from './components/ExpenseForm';
import Summary from './components/Summary';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'cargar' | 'resumen'>('cargar');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsAuthenticated(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/status');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
    } catch (e) {
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const { url } = await res.json();
      window.open(url, 'google_auth', 'width=600,height=700');
    } catch (e) {
      alert('Error al iniciar sesión');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const isConfigured = !!window.process?.env?.GOOGLE_CLIENT_ID || true; // Can't easily check from client, but I'll add a help text
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-200 text-center"
        >
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <PieChart className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Gastos Mensuales</h1>
          <p className="text-gray-500 mb-8">
            Conecta tu cuenta de Google para sincronizar tus gastos directamente en tu planilla.
          </p>
          
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mb-4 shadow-lg shadow-indigo-100"
          >
            <LogIn className="w-5 h-5" />
            Vincular con Google Sheets
          </button>

          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-left">
            <h3 className="text-sm font-bold text-amber-800 mb-1 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Configuración Inicial
            </h3>
            <p className="text-xs text-amber-700 leading-relaxed">
              Para que la app funcione, debes configurar las credenciales de Google (ID de cliente y Secreto) en la pestaña de <b>Secrets</b>.
            </p>
          </div>
          
          <div className="mt-6 text-[10px] text-gray-400 uppercase tracking-widest leading-relaxed text-left space-y-2">
            <p>URLs de redireccionamiento (OAuth Redirect URIs):</p>
            <div className="space-y-1">
              <p className="font-bold">Desarrollo:</p>
              <code className="bg-gray-100 px-1 py-0.5 rounded select-all font-mono block break-all text-[9px] uppercase-none tracking-normal">
                https://ais-dev-qnzpzgy6hs643ry5n3alcb-151964114044.us-east1.run.app/auth/callback
              </code>
              <p className="font-bold">Compartido/Producción:</p>
              <code className="bg-gray-100 px-1 py-0.5 rounded select-all font-mono block break-all text-[9px] uppercase-none tracking-normal">
                https://ais-pre-qnzpzgy6hs643ry5n3alcb-151964114044.us-east1.run.app/auth/callback
              </code>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-100 p-6 md:p-10 max-w-[1440px] mx-auto">
      <header className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <PieChart className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Gestor de Finanzas</h1>
            <p className="text-sm text-gray-500 font-medium">Control Mensual • Excel Sincronizado</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 pt-2 md:pt-0">
          <div className="flex items-center gap-1 bg-white border border-gray-200 p-1 rounded-xl shadow-sm">
            <button
              onClick={() => setActiveTab('cargar')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                activeTab === 'cargar' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <PlusCircle className="w-4 h-4" />
              Cargar
            </button>
            <button
              onClick={() => setActiveTab('resumen')}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all",
                activeTab === 'resumen' ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <PieChart className="w-4 h-4" />
              Resumen
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-900 hover:text-white transition-all overflow-hidden"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'cargar' ? (
            <motion.div
              key="cargar"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-8"
            >
              <div className="md:col-span-12 lg:col-span-7 xl:col-span-6 mx-auto w-full">
                <ExpenseForm />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="resumen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Summary />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-5xl mx-auto mt-12 py-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-400 font-medium uppercase tracking-wider">
        <div className="flex gap-6">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Sincronizado con Google Sheets
          </span>
          <span className="opacity-60 truncate max-w-[200px]">ID: 1BKLs16PSz7mg...</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
        </div>
      </footer>
    </div>
  );
}
