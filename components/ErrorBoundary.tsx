
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white text-center">
                    <div className="size-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined !text-5xl">error</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 mb-4">Ups, algo salió mal</h1>
                    <p className="text-slate-500 mb-8 max-w-xs">
                        Hubo un error inesperado en la aplicación. Por favor, intenta recargar la página.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full max-w-xs bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/25"
                    >
                        Recargar Aplicación
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
