'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-poker-dark p-4">
          <div className="max-w-md w-full bg-poker-card rounded-lg border border-white/10 p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-poker-red/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-poker-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Oops, algo salió mal</h2>
            <p className="text-poker-muted mb-6">
              Ha ocurrido un error inesperado. Por favor, recarga la página para continuar.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                if (typeof window !== 'undefined') {
                  window.location.reload()
                }
              }}
              className="bg-poker-red hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary