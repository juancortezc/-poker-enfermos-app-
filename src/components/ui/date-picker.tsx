'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Seleccionar fecha',
  disabled = false,
  required = false,
  className
}: DatePickerProps) {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (onChange) {
      onChange(newValue)
    }
  }

  const hasValue = value && typeof value === 'string' && value.trim() !== ''
  const displayValue = hasValue ? format(new Date(value + 'T12:00:00'), 'dd/MM/yy') : ''

  return (
    <div className="relative">
      <div className="relative">
        {/* Icono indicador - siempre visible para mostrar dónde hacer click */}
        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-poker-muted pointer-events-none z-10" />
        
        {/* Input nativo de fecha */}
        <input
          type="date"
          value={value || ''}
          onChange={handleDateChange}
          disabled={disabled}
          required={required}
          className={cn(
            // Base styles
            "w-full h-9 pl-3 pr-10 py-2 text-sm bg-poker-dark/50 border border-white/10 rounded-md",
            "text-white placeholder:text-poker-muted",
            "transition-colors duration-200",
            
            // Focus states
            "focus:outline-none focus:ring-1 focus:ring-poker-red/50 focus:border-poker-red",
            
            // Hover states  
            "hover:border-white/20 cursor-pointer",
            
            // Disabled states
            "disabled:opacity-50 disabled:cursor-not-allowed",
            
            // Date picker specific styles - ocultar el icono nativo
            "[&::-webkit-calendar-picker-indicator]:opacity-0",
            "[&::-webkit-calendar-picker-indicator]:absolute",
            "[&::-webkit-calendar-picker-indicator]:inset-0",
            "[&::-webkit-calendar-picker-indicator]:w-full",
            "[&::-webkit-calendar-picker-indicator]:h-full",
            "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
            
            className
          )}
          style={{
            colorScheme: 'dark'
          }}
        />
        
        {/* Overlay para mostrar formato personalizado */}
        {hasValue && (
          <div className="absolute inset-0 flex items-center pl-3 pr-10 pointer-events-none">
            <span className="text-sm text-white font-medium">
              {displayValue}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}