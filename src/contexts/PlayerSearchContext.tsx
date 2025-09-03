'use client'

import React, { createContext, useContext, useState } from 'react'

interface PlayerSearchContextType {
  searchTerm: string
  setSearchTerm: (term: string) => void
  showAddButton: boolean
  setShowAddButton: (show: boolean) => void
  onAddClick: (() => void) | null
  setOnAddClick: (handler: (() => void) | null) => void
}

const PlayerSearchContext = createContext<PlayerSearchContextType | undefined>(undefined)

export function PlayerSearchProvider({ children }: { children: React.ReactNode }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddButton, setShowAddButton] = useState(false)
  const [onAddClick, setOnAddClick] = useState<(() => void) | null>(null)

  return (
    <PlayerSearchContext.Provider value={{
      searchTerm,
      setSearchTerm,
      showAddButton,
      setShowAddButton,
      onAddClick,
      setOnAddClick
    }}>
      {children}
    </PlayerSearchContext.Provider>
  )
}

export function usePlayerSearch() {
  const context = useContext(PlayerSearchContext)
  if (context === undefined) {
    throw new Error('usePlayerSearch must be used within a PlayerSearchProvider')
  }
  return context
}