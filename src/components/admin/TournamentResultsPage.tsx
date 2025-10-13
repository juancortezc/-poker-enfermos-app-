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
    <div className="min-h-screen bg-gradient-to-br from-[#1a1208] via-[#0f0a04] to-[#0a0703] text-white">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
        {/* Header */}
        <section className="rounded-3xl border border-[#e0b66c]/20 bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1a1208] p-6 shadow-[0_24px_60px_rgba(11,6,3,0.55)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-[12px] uppercase tracking-[0.35em] text-[#d7c59a]">Historial</p>
              <h1 className="text-3xl font-semibold tracking-tight text-[#f3e6c5]">Resultados de Torneos</h1>
              <p className="max-w-2xl text-sm text-[#d7c59a]">
                Consulta campeones, podios y desempeño histórico del grupo. Incluye los resultados oficiales del Torneo 28.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e0b66c]/25 bg-[#24160f]/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d7c59a]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#e0b66c]" />
              Noir Jazz
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
                      ? 'border-[#e0b66c]/60 bg-gradient-to-r from-[#a9441c] via-[#8d3717] to-[#a9441c] text-[#f3e6c5] shadow-[0_12px_28px_rgba(224,182,108,0.35)]'
                      : 'border-[#e0b66c]/20 bg-[#24160f]/40 text-[#d7c59a] hover:text-[#f3e6c5] hover:border-[#e0b66c]/40'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="rounded-3xl border border-[#e0b66c]/20 bg-gradient-to-br from-[#2a1a14] via-[#24160f] to-[#1a1208] p-0 shadow-[0_24px_60px_rgba(11,6,3,0.45)]">
            <div className="relative overflow-hidden rounded-3xl">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(224,182,108,0.12),_transparent_55%)]" />
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
