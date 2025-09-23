'use client'

import { useState } from 'react'
import { Trophy, Medal, BarChart3 } from 'lucide-react'
import ChampionshipsTable from './ChampionshipsTable'
import ChampionsCards from './ChampionsCards'
import PodiumStatsTable from './PodiumStatsTable'

type TabId = 'campeonatos' | 'campeones' | 'podios'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<any>
}

const tabs: Tab[] = [
  { id: 'campeonatos', label: 'Campeonatos', icon: Trophy },
  { id: 'campeones', label: 'Campeones', icon: Medal },
  { id: 'podios', label: 'Podios', icon: BarChart3 }
]

export default function TournamentResultsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('campeonatos')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'campeonatos':
        return <ChampionshipsTable />
      case 'campeones':
        return <ChampionsCards />
      case 'podios':
        return <PodiumStatsTable />
      default:
        return <ChampionshipsTable />
    }
  }

  return (
    <div className="min-h-screen bg-poker-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Resultados Históricos
          </h1>
          <p className="text-poker-muted">
            Torneos 1-27 • Historia completa del grupo
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-600">
            <nav className="-mb-px flex">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-3 px-2 sm:px-6 border-b-3 font-semibold text-xs sm:text-sm
                      transition-all duration-300 rounded-t-lg
                      ${isActive
                        ? 'border-poker-red text-white bg-poker-card/50 shadow-lg'
                        : 'border-transparent text-gray-300 hover:text-white hover:bg-poker-card/30 hover:border-gray-400'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden xs:inline sm:inline">{tab.label}</span>
                    <span className="xs:hidden">{tab.label.substring(0, 4)}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-poker-card rounded-lg shadow-xl tournament-results-container relative overflow-visible">
          <div className="relative">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  )
}