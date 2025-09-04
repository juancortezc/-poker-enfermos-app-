import React from 'react'
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'

interface ValidationMessageProps {
  type: 'error' | 'warning' | 'success' | 'info'
  message: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const ValidationMessage: React.FC<ValidationMessageProps> = ({
  type,
  message,
  className = '',
  size = 'md'
}) => {
  const getIcon = () => {
    const iconSize = size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
    
    switch (type) {
      case 'error':
        return <AlertCircle className={`${iconSize} text-red-400`} />
      case 'warning':
        return <AlertTriangle className={`${iconSize} text-yellow-400`} />
      case 'success':
        return <CheckCircle className={`${iconSize} text-green-400`} />
      case 'info':
        return <Info className={`${iconSize} text-blue-400`} />
      default:
        return <Info className={`${iconSize} text-gray-400`} />
    }
  }

  const getStyles = () => {
    const baseStyles = 'flex items-start space-x-2 rounded-md p-2 text-sm animate-in slide-in-from-top-1 duration-200'
    const sizeStyles = {
      sm: 'text-xs p-1.5',
      md: 'text-sm p-2',
      lg: 'text-base p-3'
    }
    
    switch (type) {
      case 'error':
        return `${baseStyles} ${sizeStyles[size]} bg-red-500/10 border border-red-500/20 text-red-300`
      case 'warning':
        return `${baseStyles} ${sizeStyles[size]} bg-yellow-500/10 border border-yellow-500/20 text-yellow-300`
      case 'success':
        return `${baseStyles} ${sizeStyles[size]} bg-green-500/10 border border-green-500/20 text-green-300`
      case 'info':
        return `${baseStyles} ${sizeStyles[size]} bg-blue-500/10 border border-blue-500/20 text-blue-300`
      default:
        return `${baseStyles} ${sizeStyles[size]} bg-gray-500/10 border border-gray-500/20 text-gray-300`
    }
  }

  return (
    <div className={`${getStyles()} ${className}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p>{message}</p>
      </div>
    </div>
  )
}

interface ValidationSummaryProps {
  errors: Array<{ field: string; message: string; type: 'error' | 'warning' }>
  warnings: Array<{ field: string; message: string; type: 'error' | 'warning' }>
  className?: string
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  warnings,
  className = ''
}) => {
  if (errors.length === 0 && warnings.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {errors.map((error, index) => (
        <ValidationMessage
          key={`error-${index}`}
          type="error"
          message={error.message}
        />
      ))}
      {warnings.map((warning, index) => (
        <ValidationMessage
          key={`warning-${index}`}
          type="warning"
          message={warning.message}
        />
      ))}
    </div>
  )
}

interface FieldValidationProps {
  errors: Array<{ field: string; message: string; type: 'error' | 'warning' }>
  field: string
  className?: string
}

export const FieldValidation: React.FC<FieldValidationProps> = ({
  errors,
  field,
  className = ''
}) => {
  const fieldErrors = errors.filter(error => 
    error.field === field || error.field.startsWith(`${field}-`)
  )
  
  if (fieldErrors.length === 0) {
    return null
  }

  return (
    <div className={`mt-1 space-y-1 ${className}`}>
      {fieldErrors.map((error, index) => (
        <ValidationMessage
          key={index}
          type={error.type}
          message={error.message}
          size="sm"
        />
      ))}
    </div>
  )
}

export default ValidationMessage