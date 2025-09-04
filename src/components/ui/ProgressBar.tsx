import React from 'react'

interface ProgressBarProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'cyan' | 'purple'
  showValue?: boolean
  label?: string
  className?: string
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'blue',
  showValue = false,
  label,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100)

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2'
      case 'lg':
        return 'h-4'
      default:
        return 'h-3'
    }
  }

  const getColorClasses = () => {
    switch (color) {
      case 'green':
        return 'bg-green-500'
      case 'red':
        return 'bg-red-500'
      case 'yellow':
        return 'bg-yellow-500'
      case 'cyan':
        return 'bg-cyan-500'
      case 'purple':
        return 'bg-purple-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-1">
          {label && <span className="text-sm text-poker-text">{label}</span>}
          {showValue && (
            <span className="text-sm text-poker-muted">
              {value}/{max}
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-poker-dark/50 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`${getColorClasses()} ${getSizeClasses()} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && !label && (
        <div className="text-center mt-1">
          <span className="text-xs text-poker-muted">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'cyan' | 'purple'
  showValue?: boolean
  className?: string
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'blue',
  showValue = false,
  className = ''
}) => {
  const percentage = Math.min((value / max) * 100, 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getStrokeColor = () => {
    switch (color) {
      case 'green':
        return '#10b981'
      case 'red':
        return '#ef4444'
      case 'yellow':
        return '#f59e0b'
      case 'cyan':
        return '#06b6d4'
      case 'purple':
        return '#8b5cf6'
      default:
        return '#3b82f6'
    }
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="opacity-20"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getStrokeColor()}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-poker-text">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  )
}

interface StepProgressProps {
  steps: Array<{
    id: string
    label: string
    completed?: boolean
    active?: boolean
    error?: boolean
  }>
  className?: string
}

export const StepProgress: React.FC<StepProgressProps> = ({ steps, className = '' }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all duration-200 ${
                step.error
                  ? 'bg-red-500/20 border-red-500 text-red-400'
                  : step.completed
                  ? 'bg-green-500/20 border-green-500 text-green-400'
                  : step.active
                  ? 'bg-poker-red/20 border-poker-red text-poker-red'
                  : 'bg-poker-dark/50 border-white/20 text-poker-muted'
              }`}
            >
              {step.completed ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : step.error ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span
              className={`text-xs mt-1 transition-colors duration-200 ${
                step.active ? 'text-poker-red' : step.completed ? 'text-green-400' : 'text-poker-muted'
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 transition-colors duration-200 ${
                steps[index + 1].completed || steps[index + 1].active
                  ? 'bg-green-500'
                  : 'bg-poker-dark/50'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default ProgressBar