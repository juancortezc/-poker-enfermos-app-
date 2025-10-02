'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minRows?: number
  maxRows?: number
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ className, minRows = 3, maxRows = 12, onChange, ...props }, ref) => {
    const [value, setValue] = React.useState(props.value || '')
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Merge refs
    React.useImperativeHandle(ref, () => textareaRef.current!)

    const adjustHeight = React.useCallback(() => {
      const textarea = textareaRef.current
      if (!textarea) return

      // Reset height to recalculate
      textarea.style.height = 'auto'

      // Calculate new height
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24
      const minHeight = lineHeight * minRows
      const maxHeight = lineHeight * maxRows
      const scrollHeight = textarea.scrollHeight

      // Set height within bounds
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
      textarea.style.height = `${newHeight}px`
    }, [minRows, maxRows])

    // Adjust height on value change
    React.useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    // Handle change event
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      // Call original onChange if provided
      if (onChange) {
        onChange(e)
      }

      // Adjust height after state update
      setTimeout(adjustHeight, 0)
    }

    return (
      <textarea
        ref={textareaRef}
        className={cn(
          'flex w-full rounded-md border border-input bg-transparent px-3 py-3 text-sm text-white shadow-sm placeholder:text-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-poker-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-50 resize-none overflow-y-auto leading-relaxed',
          className
        )}
        style={{
          minHeight: `${minRows * 24}px`,
          maxHeight: `${maxRows * 24}px`
        }}
        onChange={handleChange}
        {...props}
      />
    )
  }
)

AutoResizeTextarea.displayName = 'AutoResizeTextarea'

export { AutoResizeTextarea }