import TimerDisplay from '@/components/TimerDisplay'

export default function TimerPage() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Timer del Torneo</h1>
        <p className="text-gray-600">Control de blinds y tiempo</p>
      </div>
      
      <TimerDisplay gameDateId={1} />
    </div>
  )
}