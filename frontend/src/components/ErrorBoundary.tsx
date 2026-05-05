import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "../utils/logger";
import { FiAlertTriangle } from "react-icons/fi";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught exception in React component tree", error, { componentStack: errorInfo.componentStack });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
         return this.props.fallback;
      }
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <FiAlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Algo salió mal</h2>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              Ocurrió un error inesperado al cargar esta pantalla. Por favor, intentá volver atrás o ir al inicio.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={() => {
                  this.setState({ hasError: false });
                  window.history.back();
                }} 
                className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 !text-slate-800 font-semibold text-sm px-5 py-3 rounded-xl transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 w-full"
              >
                Volver atrás
              </button>
              <button 
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = '/';
                }} 
                className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 !text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full"
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
