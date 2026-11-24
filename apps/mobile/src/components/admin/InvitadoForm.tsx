/**
 * Alta y edición de invitados. Paridad con InvitadoFormPage de la web:
 * nombre, apellido opcional (se registran como "Sobrino Diego"), el Enfermo
 * que lo invita y el año. Sin clave: los invitados no entran a la app.
 */
import { fullName, getEcuadorToday } from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Overline } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';

import { confirmAction, errorMessage, useAdminRefresh, useMembers } from './api';
import { Field, FormError } from './Form';

const GUEST_PHOTO_URL = 'https://storage.googleapis.com/poker-enfermos/pato.png';

export interface EditableInvitado {
  id: string;
  firstName: string;
  lastName: string;
  inviterId?: string | null;
  inviter?: { id: string } | null;
  joinYear?: number | null;
  isActive?: boolean;
}

export function InvitadoForm({ invitado }: { invitado?: EditableInvitado }) {
  const refresh = useAdminRefresh();
  const { members } = useMembers();
  const currentYear = getEcuadorToday().year;
  const editing = !!invitado;

  const [firstName, setFirstName] = useState(invitado?.firstName ?? '');
  const [lastName, setLastName] = useState(invitado?.lastName ?? '');
  const [inviterId, setInviterId] = useState<string | null>(invitado?.inviterId ?? invitado?.inviter?.id ?? null);
  const [joinYear, setJoinYear] = useState(String(invitado?.joinYear ?? currentYear));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!firstName.trim()) return setError('El nombre es obligatorio.');
    if (!inviterId) return setError('Elegí el Enfermo que lo invita.');
    const year = parseInt(joinYear, 10);
    if (!(year >= 2000 && year <= currentYear)) return setError(`El año debe estar entre 2000 y ${currentYear}.`);

    setSaving(true);
    try {
      await apiFetch(editing ? `/api/players/${invitado.id}` : '/api/players', {
        method: editing ? 'PUT' : 'POST',
        json: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'Invitado',
          aliases: [],
          inviterId,
          photoUrl: GUEST_PHOTO_URL,
          joinYear: year,
        },
      });
      refresh.players();
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Error al guardar el invitado'));
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!invitado) return;
    const ok = await confirmAction('Inactivar invitado', `${firstName} deja de aparecer para elegir en las fechas.`, 'Inactivar');
    if (!ok) return;
    setSaving(true);
    try {
      await apiFetch(`/api/players/${invitado.id}`, { method: 'DELETE' });
      refresh.players();
      router.back();
    } catch (e) {
      setError(errorMessage(e, 'Error al inactivar'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-4">
      <NoirCard className="gap-4 p-4">
        <Field label="Nombre *" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Field label="Apellido" value={lastName} onChangeText={setLastName} autoCapitalize="words" hint="Opcional: “Sobrino Diego” vale." />
        <View className="gap-1.5">
          <Overline className="text-[11px]">Invitado por *</Overline>
          <OptionPicker
            label="Invitado por"
            value={inviterId}
            placeholder={members ? 'Elegir Enfermo' : 'Cargando…'}
            options={(members ?? []).map((p) => ({ value: p.id, label: fullName(p) }))}
            onChange={setInviterId}
          />
        </View>
        <Field label="Año" value={joinYear} onChangeText={(t) => setJoinYear(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" />
      </NoirCard>
      <FormError message={error} />
      <NoirButton title={editing ? 'Guardar cambios' : 'Crear invitado'} size="lg" loading={saving} onPress={save} />
      {editing && invitado.isActive !== false ? (
        <NoirButton title="Inactivar invitado" variant="ghost" disabled={saving} onPress={deactivate} />
      ) : null}
    </View>
  );
}
