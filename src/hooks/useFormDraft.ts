import { useState, useEffect, useCallback, useRef } from 'react'

interface FormDraftOptions {
  key: string
  autosaveInterval?: number
  onSave?: (data: unknown) => void
  onRestore?: (data: unknown) => void
}

interface FormDraftResult<T> {
  saveDraft: (data: T) => void
  loadDraft: () => T | null
  clearDraft: () => void
  hasDraft: boolean
  lastSaved: Date | null
  isAutoSaving: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFormDraft<T extends Record<string, any>>(
  initialData: T,
  options: FormDraftOptions
): FormDraftResult<T> {
  const { key, autosaveInterval = 30000, onSave, onRestore } = options
  const [hasDraft, setHasDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const autosaveTimeoutRef = useRef<NodeJS.Timeout>()
  const storageKey = `tournament-draft-${key}`

  // Verificar si existe draft al montar
  useEffect(() => {
    const draft = localStorage.getItem(storageKey)
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft)
        if (parsedDraft.data && parsedDraft.timestamp) {
          setHasDraft(true)
          setLastSaved(new Date(parsedDraft.timestamp))
        }
      } catch (error) {
        console.warn('Error parsing draft:', error)
        localStorage.removeItem(storageKey)
      }
    }
  }, [storageKey])

  const saveDraft = useCallback((data: T) => {
    try {
      const draftData = {
        data,
        timestamp: Date.now(),
        version: '1.0'
      }
      
      localStorage.setItem(storageKey, JSON.stringify(draftData))
      setHasDraft(true)
      setLastSaved(new Date())
      onSave?.(data)
    } catch (error) {
      console.error('Error saving draft:', error)
    }
  }, [storageKey, onSave])

  const loadDraft = useCallback((): T | null => {
    try {
      const draft = localStorage.getItem(storageKey)
      if (!draft) return null

      const parsedDraft = JSON.parse(draft)
      if (parsedDraft.data && parsedDraft.timestamp) {
        onRestore?.(parsedDraft.data)
        return parsedDraft.data
      }
      return null
    } catch (error) {
      console.error('Error loading draft:', error)
      return null
    }
  }, [storageKey, onRestore])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    setHasDraft(false)
    setLastSaved(null)
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }
  }, [storageKey])

  // Auto-guardado
  const scheduleAutosave = useCallback((data: T) => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current)
    }

    autosaveTimeoutRef.current = setTimeout(() => {
      setIsAutoSaving(true)
      saveDraft(data)
      setTimeout(() => setIsAutoSaving(false), 500)
    }, autosaveInterval)
  }, [autosaveInterval, saveDraft])

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  return {
    saveDraft: useCallback((data: T) => {
      saveDraft(data)
      scheduleAutosave(data)
    }, [saveDraft, scheduleAutosave]),
    loadDraft,
    clearDraft,
    hasDraft,
    lastSaved,
    isAutoSaving
  }
}

export function useFormValidation<T extends Record<string, unknown>>(
  data: T,
  validator: (data: T) => { isValid: boolean; errors: string[]; warnings: string[] }
) {
  const [validationResult, setValidationResult] = useState(() => validator(data))
  const [isValidating, setIsValidating] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  const validateWithDebounce = useCallback((newData: T, delay = 300) => {
    setIsValidating(true)
    
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const result = validator(newData)
      setValidationResult(result)
      setIsValidating(false)
    }, delay)
  }, [validator])

  const validateImmediate = useCallback((newData: T) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    const result = validator(newData)
    setValidationResult(result)
    setIsValidating(false)
  }, [validator])

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return {
    ...validationResult,
    isValidating,
    validateWithDebounce,
    validateImmediate
  }
}