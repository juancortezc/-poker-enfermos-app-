'use client'

import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const noirButtonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0b66c]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#140d0a] disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-[linear-gradient(135deg,rgba(224,182,108,0.96),rgba(169,68,28,0.9))] text-[#1f1410] shadow-[0_18px_40px_rgba(224,182,108,0.28)] hover:-translate-y-[1px] hover:shadow-[0_26px_60px_rgba(224,182,108,0.32)] active:translate-y-0 active:shadow-[0_12px_28px_rgba(224,182,108,0.24)]",
        secondary:
          "bg-[linear-gradient(135deg,rgba(44,28,21,0.95),rgba(24,14,10,0.92))] border border-[#e0b66c]/35 text-[#f3e6c5] shadow-[0_16px_36px_rgba(11,6,3,0.45)] hover:border-[#e0b66c]/55 hover:-translate-y-[1px]",
        ghost:
          "border border-transparent text-[#f3e6c5]/80 hover:border-[#e0b66c]/35 hover:bg-[#2a1a14]/70 hover:text-[#f3e6c5]",
        outline:
          "border border-[#e0b66c]/55 text-[#e0b66c] hover:bg-[#2a1a14]/70 hover:text-[#f9f5ec]",
      },
      size: {
        sm: "px-4 py-2 text-[10px]",
        md: "px-6 py-3",
        lg: "px-8 py-3.5 text-[12px]",
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

type NoirButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof noirButtonVariants> & {
    asChild?: boolean
  }

export const NoirButton = React.forwardRef<HTMLButtonElement, NoirButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'

    return (
      <Comp
        ref={ref}
        className={cn(noirButtonVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)

NoirButton.displayName = 'NoirButton'
