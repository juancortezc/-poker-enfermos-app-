'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, X } from 'lucide-react'
import { getStoredAuthToken } from '@/lib/client-auth'
import { isValidPinForCreation, PIN_RULE_TEXT } from '@/lib/pin-rules'

/**
 * Le pide a quien entra con una clave vieja que la actualice.
 *
 * COMO SE DETECTA, SIN PREGUNTARLE A NADIE
 *
 * La clave se guarda en el dispositivo para armar el header de autorizacion,
 * asi que aqui se puede evaluar contra la regla actual. Si no la cumple —las
 * viejas son cuatro digitos— es una clave a reforzar. No hace falta consultar
 * al servidor ni que el servidor diga quien tiene una clave debil: eso seria
 * exponer informacion sensible sin necesidad.
 *
 * Es un recordatorio, no un bloqueo: las claves viejas siguen sirviendo para
 * entrar. Obligar a cambiarla de golpe dejaria gente afuera un dia de fecha.
 */

const CLAVE_POSPUESTO = 'clave_debil_pospuesta'
/** Vuelve a aparecer a la semana: insistir sin volverse molesto. */
const DIAS_SNOOZE = 7

function estaPospuesto(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const guardado = localStorage.getItem(CLAVE_POSPUESTO)
    if (!guardado) return false
    const cuando = new Date(guardado).getTime()
    if (Number.isNaN(cuando)) return false
    return Date.now() - cuando < DIAS_SNOOZE * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function ClaveDebilBanner() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const credencial = getStoredAuthToken()
    // Solo aplica a quien entro con clave; el adminKey es otro mecanismo.
    if (!credencial || credencial.scheme !== 'PIN') return
    if (isValidPinForCreation(credencial.value)) return
    if (estaPospuesto()) return
    setVisible(true)
  }, [])

  if (!visible) return null

  const posponer = () => {
    setVisible(false)
    try {
      localStorage.setItem(CLAVE_POSPUESTO, new Date().toISOString())
    } catch {
      // En modo privado falla: vuelve a aparecer al recargar, y esta bien.
    }
  }

  return (
    <div
      className="flex items-start gap-3 p-4"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
        borderLeft: '4px solid #C2410C',
        borderRadius: 'var(--cp-radius-lg, 14px)',
      }}
    >
      <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#C2410C' }} />

      <div className="flex-1 min-w-0">
        <p
          className="font-semibold"
          style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
        >
          Actualiza tu clave
        </p>
        <p
          className="mt-1"
          style={{
            fontSize: 'var(--cp-caption-size)',
            color: 'var(--cp-on-surface-variant)',
            lineHeight: 1.5,
          }}
        >
          La tuya es de las viejas, de cuatro números: son diez mil
          combinaciones y se adivinan solas. Ahora la clave admite letras.
          {' '}{PIN_RULE_TEXT}.
        </p>

        <button
          onClick={() => router.push('/perfil?tab=datos')}
          className="mt-3 px-4 py-2 font-semibold transition-opacity hover:opacity-90"
          style={{
            background: 'var(--cp-primary)',
            color: '#fff',
            borderRadius: 'var(--cp-radius-full, 999px)',
            fontSize: 'var(--cp-label-size, 13px)',
          }}
        >
          Cambiarla ahora
        </button>
      </div>

      <button
        onClick={posponer}
        aria-label="Recordármelo después"
        className="flex-shrink-0 p-1 -m-1"
        style={{ color: 'var(--cp-on-surface-variant)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export default ClaveDebilBanner
