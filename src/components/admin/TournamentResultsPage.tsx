'use client'

import { useState } from 'react'
import type { ComponentType } from 'react'
import { Trophy, Medal, BarChart3 } from 'lucide-react'
import ChampionshipsTable from './ChampionshipsTable'
import ChampionsCards from './ChampionsCards'
import PodiumStatsTable from './PodiumStatsTable'

type TabId = 'torneos' | 'campeones' | 'podios'

interface Tab {
  id: TabId
  label: string
  icon: ComponentType<{ className?: string }>
}

const tabs: Tab[] = [
  { id: 'torneos', label: 'Torneos', icon: Trophy },
  { id: 'campeones', label: 'Campeones', icon: Medal },
  { id: 'podios', label: 'Podios', icon: BarChart3 }
]

export default function TournamentResultsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('torneos')

  const renderTabContent = () => {
    switch (activeTab) {
      case 'torneos':
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
          <h1 className="text-3xl font-bold text-white">
            Resultados Históricos
          </h1>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-700/60">
            <nav className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all duration-200
                      border-b-2 rounded-t-md
                      ${isActive
                        ? 'border-poker-red text-white bg-poker-card/40 shadow-lg'
                        : 'border-transparent text-gray-300 hover:text-white hover:border-white/30'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
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
