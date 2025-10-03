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
    <div className="min-h-screen bg-gradient-to-b from-[#0d0f1a] via-[#0b0d18] to-[#08090f] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#201c30] via-[#1b1c2b] to-[#131422] p-6 shadow-[0_24px_60px_rgba(15,15,45,0.45)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[12px] uppercase tracking-[0.35em] text-white/55">Historial</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Resultados de Torneos</h1>
              <p className="max-w-2xl text-sm text-white/65">
                Consulta campeones, podios y desempeño histórico del grupo. Incluye los resultados oficiales del Torneo 28.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
              <span className="h-2 w-2 animate-pulse rounded-full bg-poker-red" />
              PokerNew
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-6">
          <nav className="flex flex-wrap gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
                    isActive
                      ? 'border-poker-red/60 bg-gradient-to-r from-poker-red via-[#ff5d8f] to-[#ff9f6a] text-white shadow-[0_12px_28px_rgba(255,93,143,0.35)]'
                      : 'border-white/12 bg-white/5 text-white/70 hover:text-white hover:border-white/35'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="rounded-3xl border border-white/12 bg-gradient-to-br from-[#1b1d2f] via-[#181a2c] to-[#111221] p-0 shadow-[0_24px_60px_rgba(8,9,15,0.45)]">
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
              <div className="relative">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
