/**
 * Invitados externos (rol Invitado) al configurar o editar una fecha, como
 * ExternalGuestPicker de la web: los que tienen nombre van por participación
 * más reciente con "invitado por X"; los comodines sin nombre ("Invitado 1
 * S/N") quedan al final, aparte. "Nuevo invitado" abre aquí mismo un
 * formulario corto (nombre, apellido, quién invita) y deja elegido al nuevo.
 * Los miembros del grupo no pasan por aquí.
 */
import { createGuestSchema, fullName, groupExternalGuests, guestInviterLabel } from '@poker/shared';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline } from '@/components/ui/Typography';
import { apiFetch, ApiError } from '@/lib/api';

import { errorMessage, useAdminRefresh, useMembers, type AdminPlayer } from './api';
import { Field, FormError, Notice } from './Form';
import { PlayerPicker } from './PlayerPicker';

type Props = {
  guests: AdminPlayer[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Jugadores de la fecha: se ofrecen primero como invitadores. */
  playingIds?: readonly string[];
  loading?: boolean;
};

export function ExternalGuestPicker({ guests, selected, onChange, playingIds = [], loading }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  // Creados o elegidos desde el formulario, hasta que la lista los traiga.
  const [extra, setExtra] = useState<AdminPlayer[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const all = useMemo(() => {
    const ids = new Set(guests.map((g) => g.id));
    return [...guests, ...extra.filter((g) => !ids.has(g.id))];
  }, [guests, extra]);
  const { named, placeholders } = groupExternalGuests(all);

  const addAndSelect = (guest: AdminPlayer, created: boolean) => {
    setExtra((prev) => (prev.some((g) => g.id === guest.id) ? prev : [...prev, guest]));
    if (!selected.includes(guest.id)) onChange([...selected, guest.id]);
    setFormOpen(false);
    setNotice(`${fullName(guest)} ${created ? 'quedó registrado y' : 'ya estaba registrado:'} elegido para la fecha.`);
  };

  return (
    <View className="gap-3">
      {formOpen ? (
        <NewGuestForm playingIds={playingIds} onDone={addAndSelect} onCancel={() => setFormOpen(false)} />
      ) : (
        <CPButton
          title="Nuevo invitado"
          variant="outline"
          onPress={() => {
            setNotice(null);
            setFormOpen(true);
          }}
        />
      )}
      {notice ? <Notice tone="ok">{notice}</Notice> : null}

      <PlayerPicker
        players={named}
        selected={selected}
        onChange={onChange}
        accent="info"
        detail={guestInviterLabel}
        emptyMessage={loading ? 'Cargando invitados…' : 'No hay invitados con nombre. Créalo con "Nuevo invitado".'}
        showBulk={false}
      />

      {placeholders.length > 0 ? (
        <View className="gap-2 pt-2">
          <Overline className="text-[11px]">Sin nombre (solo si no hay otra opción)</Overline>
          <PlayerPicker players={placeholders} selected={selected} onChange={onChange} accent="info" showBulk={false} />
        </View>
      ) : null}
    </View>
  );
}

type FieldName = 'firstName' | 'lastName' | 'inviterId';

function NewGuestForm({
  playingIds,
  onDone,
  onCancel,
}: {
  playingIds: readonly string[];
  onDone: (guest: AdminPlayer, created: boolean) => void;
  onCancel: () => void;
}) {
  const refresh = useAdminRefresh();
  const { members } = useMembers();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [inviterId, setInviterId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<AdminPlayer | null>(null);
  const [saving, setSaving] = useState(false);

  const options = useMemo(() => {
    const playing = new Set(playingIds);
    return [...(members ?? [])]
      .sort((a, b) => Number(playing.has(b.id)) - Number(playing.has(a.id)) || fullName(a).localeCompare(fullName(b), 'es'))
      .map((p) => ({ value: p.id, label: fullName(p), hint: playing.has(p.id) ? 'juega' : undefined }));
  }, [members, playingIds]);

  const save = async () => {
    setError(null);
    setExisting(null);
    const parsed = createGuestSchema.safeParse({ firstName, lastName, inviterId: inviterId ?? '' });
    if (!parsed.success) {
      const next: Partial<Record<FieldName, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName;
        next[field] ??= issue.message;
      }
      return setErrors(next);
    }
    setErrors({});
    setSaving(true);
    try {
      const guest = await apiFetch<AdminPlayer>('/api/players/guests', { method: 'POST', json: parsed.data });
      refresh.players();
      onDone(guest, true);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_GUEST' && e.details.existingGuest) {
        setExisting(e.details.existingGuest as AdminPlayer);
        setError(e.message);
      } else if (e instanceof ApiError && e.errors?.length) {
        const next: Partial<Record<FieldName, string>> = {};
        for (const d of e.errors) next[d.field as FieldName] = d.message;
        setErrors(next);
      } else {
        setError(errorMessage(e, 'No se pudo crear el invitado'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <CPCard raised className="gap-3 p-4">
      <Overline>Nuevo invitado</Overline>
      <Muted className="text-xs">Con su nombre y apellido reales, para no mezclarlo con otra persona.</Muted>
      <Field label="Nombre" value={firstName} onChangeText={setFirstName} autoCapitalize="words" autoCorrect={false} error={errors.firstName} />
      <Field label="Apellido" value={lastName} onChangeText={setLastName} autoCapitalize="words" autoCorrect={false} error={errors.lastName} />
      <View className="gap-1.5">
        <Overline className="text-[11px]">Invitado por</Overline>
        <OptionPicker
          label="Invitado por"
          value={inviterId}
          placeholder={members ? 'Elige quién lo invita' : 'Cargando…'}
          options={options}
          onChange={setInviterId}
        />
        {errors.inviterId ? <Text className="font-inter text-xs text-cp-primary-light">{errors.inviterId}</Text> : null}
      </View>
      <FormError message={error} />
      {existing ? (
        <CPButton title={`Elegir a ${fullName(existing)}`} variant="outline" onPress={() => onDone(existing, false)} />
      ) : null}
      <View className="flex-row gap-3">
        <CPButton title="Cancelar" variant="ghost" className="flex-1" disabled={saving} onPress={onCancel} />
        <CPButton title="Guardar y elegir" className="flex-1" loading={saving} onPress={save} />
      </View>
    </CPCard>
  );
}
