import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showSpinner?: boolean
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Cargando...',
  size = 'md',
  className = '',
  showSpinner = true
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          spinner: 'w-4 h-4',
          text: 'text-sm',
          container: 'py-2'
        }
      case 'lg':
        return {
          spinner: 'w-8 h-8',
          text: 'text-lg',
          container: 'py-6'
        }
      default:
        return {
          spinner: 'w-6 h-6',
          text: 'text-base',
          container: 'py-4'
        }
    }
  }

  const sizeClasses = getSizeClasses()

  return (
    <div className={`flex items-center justify-center space-x-3 text-poker-muted ${sizeClasses.container} ${className}`}>
      {showSpinner && (
        <Loader2 className={`${sizeClasses.spinner} animate-spin`} />
      )}
      <span className={sizeClasses.text}>{message}</span>
    </div>
  )
}

interface SkeletonProps {
  className?: string
  count?: number
  width?: string
  height?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  count = 1,
  width = 'w-full',
  height = 'h-4'
}) => {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${width} ${height} bg-poker-dark/50 animate-pulse rounded-md mb-2 last:mb-0`}
        />
      ))}
    </div>
  )
}

interface CardSkeletonProps {
  className?: string
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`bg-poker-card border border-white/10 rounded-lg p-6 ${className}`}>
      <Skeleton height="h-6" width="w-3/4" className="mb-4" />
      <Skeleton height="h-4" width="w-full" count={3} className="mb-2" />
      <div className="flex justify-between items-center mt-4">
        <Skeleton height="h-8" width="w-20" />
        <Skeleton height="h-8" width="w-24" />
      </div>
    </div>
  )
}

interface FormSkeletonProps {
  className?: string
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton height="h-8" width="w-48" />
        <Skeleton height="h-10" width="w-32" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex space-x-2">
        <Skeleton height="h-10" width="w-24" />
        <Skeleton height="h-10" width="w-24" />
        <Skeleton height="h-10" width="w-24" />
      </div>

      {/* Form content skeleton */}
      <div className="bg-poker-card border border-white/10 rounded-lg p-6">
        <Skeleton height="h-6" width="w-40" className="mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Skeleton height="h-4" width="w-20" />
            <Skeleton height="h-10" width="w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton height="h-4" width="w-20" />
            <Skeleton height="h-10" width="w-full" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 bg-poker-dark/20 rounded-lg">
              <Skeleton height="h-4" width="w-16" className="mb-2" />
              <Skeleton height="h-8" width="w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Actions skeleton */}
      <div className="flex space-x-3">
        <Skeleton height="h-10" width="w-24" />
        <Skeleton height="h-10" width="w-32" />
      </div>
    </div>
  )
}

export default LoadingState