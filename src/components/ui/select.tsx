'use client'

import * as React from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectContextType {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined)

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ value = '', onValueChange, children }, ref) => {
    const [open, setOpen] = React.useState(false)

    const contextValue: SelectContextType = {
      value,
      onValueChange: onValueChange || (() => {}),
      open,
      onOpenChange: setOpen,
    }

    return (
      <SelectContext.Provider value={contextValue}>
        <div ref={ref} className="relative">
          {children}
        </div>
      </SelectContext.Provider>
    )
  }
)
Select.displayName = 'Select'

const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    placeholder?: string
  }
>(({ className, children, placeholder, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectTrigger must be used within Select')

  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-poker-red focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onClick={() => context.onOpenChange(!context.open)}
      {...props}
    >
      <span className={cn(!context.value && 'text-white/50')}>
        {children || placeholder}
      </span>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  )
})
SelectTrigger.displayName = 'SelectTrigger'

const SelectValue = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    placeholder?: string
  }
>(({ className, placeholder, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectValue must be used within Select')

  return (
    <span ref={ref} className={className} {...props}>
      {context.value || placeholder}
    </span>
  )
})
SelectValue.displayName = 'SelectValue'

const SelectContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectContent must be used within Select')

  if (!context.open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => context.onOpenChange(false)}
      />

      {/* Content */}
      <div
        ref={ref}
        className={cn(
          'absolute top-full left-0 z-50 mt-1 w-full rounded-md border border-white/20 bg-[#1a1b2b] p-1 shadow-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  )
})
SelectContent.displayName = 'SelectContent'

const SelectItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
  }
>(({ className, children, value, ...props }, ref) => {
  const context = React.useContext(SelectContext)
  if (!context) throw new Error('SelectItem must be used within Select')

  const isSelected = context.value === value

  return (
    <div
      ref={ref}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-white outline-none hover:bg-white/10 focus:bg-white/10',
        isSelected && 'bg-white/10',
        className
      )}
      onClick={() => {
        context.onValueChange(value)
        context.onOpenChange(false)
      }}
      {...props}
    >
      {isSelected && (
        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
          <Check className="h-4 w-4" />
        </span>
      )}
      {children}
    </div>
  )
})
SelectItem.displayName = 'SelectItem'

export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}