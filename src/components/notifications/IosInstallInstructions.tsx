'use client'

import { Share, Plus, Bell } from 'lucide-react'

const STEPS = [
  {
    icon: Share,
    text: 'En Safari, toca el boton Compartir (el cuadrito con la flecha hacia arriba, abajo en el centro).',
  },
  {
    icon: Plus,
    text: 'Baja en la lista y elige "Agregar a inicio". Confirma con Agregar.',
  },
  {
    icon: Bell,
    text: 'Cierra Safari y abre la app desde el icono nuevo. Ahi entra a Perfil → Alertas y activa las notificaciones.',
  },
]

/**
 * Instructivo para iPhone/iPad. Se muestra cuando el navegador no expone la
 * API de notificaciones porque la app corre en una pestana de Safari.
 */
export function IosInstallInstructions() {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--cp-surface)',
        border: '1px solid var(--cp-surface-border)',
      }}
    >
      <p
        className="font-semibold"
        style={{ fontSize: 'var(--cp-body-size)', color: 'var(--cp-on-surface)' }}
      >
        En iPhone hay que instalar la app
      </p>
      <p
        className="mt-1"
        style={{ fontSize: 'var(--cp-caption-size)', color: 'var(--cp-on-surface-muted)' }}
      >
        Apple no deja que una pagina abierta en Safari mande notificaciones. Son
        tres pasos y se hace una sola vez.
      </p>

      <ol className="mt-4 space-y-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={i} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 flex items-center justify-center font-bold"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--cp-primary)',
                  color: 'var(--cp-on-primary, #fff)',
                  fontSize: 12,
                }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0 flex items-start gap-2">
                <Icon
                  className="w-4 h-4 flex-shrink-0 mt-0.5"
                  style={{ color: 'var(--cp-on-surface-muted)' }}
                />
                <p
                  style={{
                    fontSize: 'var(--cp-caption-size)',
                    color: 'var(--cp-on-surface-variant)',
                    lineHeight: 1.5,
                  }}
                >
                  {step.text}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <p
        className="mt-4 pt-3"
        style={{
          fontSize: 'var(--cp-caption-size)',
          color: 'var(--cp-on-surface-muted)',
          borderTop: '1px solid var(--cp-surface-border)',
        }}
      >
        Tiene que ser Safari. Si abres la app en Chrome o Firefox del iPhone, la
        opcion de agregar a inicio no sirve para las notificaciones.
      </p>
    </div>
  )
}

export default IosInstallInstructions
