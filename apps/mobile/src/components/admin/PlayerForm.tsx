/**
 * Alta y edición de Enfermos y Comisión. Paridad con PlayerFormPage de la web
 * (/players/new y /players/edit/[id]): nombre, apellido, clave, alias, foto,
 * rol y datos opcionales. La clave nunca viene de la API: vacía = no se toca.
 *
 * Extras del teléfono: el cambio de rol pide confirmación, no se puede quitar
 * el rol de Comisión a uno mismo (la API lo permitiría y te dejaría fuera del
 * panel) e "Inactivar" saca al jugador del directorio con confirmación.
 */
import {
  getEcuadorToday,
  isValidPinForCreation,
  normalizePin,
  PIN_MAX_LENGTH,
  PIN_RULE_TEXT,
  type UserRole,
} from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Segmented } from '@/components/jugador/Segmented';
import { PlayerAvatar, avatarProps } from '@/components/common/PlayerAvatar';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Overline } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { noir } from '@/theme/colors';

import { confirmAction, errorMessage, useAdminRefresh } from './api';
import { Field, FormError } from './Form';

export interface EditablePlayer {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  aliases: string[];
  photoUrl?: string | null;
  birthDate?: string | null;
  phone?: string | null;
  email?: string | null;
  joinYear?: number | null;
  isActive?: boolean;
}

const ROLE_LABEL: Record<UserRole, string> = { Comision: 'Comisión', Enfermo: 'Enfermo', Invitado: 'Invitado' };

export function PlayerForm({ player }: { player?: EditablePlayer }) {
  const { user } = useAuth();
  const refresh = useAdminRefresh();
  const currentYear = getEcuadorToday().year;
  const editing = !!player;
  const isSelf = !!player && player.id === user?.id;

  const [firstName, setFirstName] = useState(player?.firstName ?? '');
  const [lastName, setLastName] = useState(player?.lastName ?? '');
  const [role, setRole] = useState<'Enfermo' | 'Comision'>(player?.role === 'Comision' ? 'Comision' : 'Enfermo');
  const [pin, setPin] = useState('');
  const [aliases, setAliases] = useState<string[]>(player?.aliases?.length ? player.aliases : ['']);
  const [photoUrl, setPhotoUrl] = useState(player?.photoUrl ?? '');
  const [birthDate, setBirthDate] = useState(player?.birthDate ?? '');
  const [phone, setPhone] = useState(player?.phone ?? '');
  const [email, setEmail] = useState(player?.email ?? '');
  const [joinYear, setJoinYear] = useState(String(player?.joinYear ?? currentYear));
  const [more, setMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinError = pin && !isValidPinForCreation(pin) ? PIN_RULE_TEXT : null;

  const save = async () => {
    setError(null);
    if (!firstName.trim()) return setError('El nombre es obligatorio.');
    if (!lastName.trim()) return setError('El apellido es obligatorio.');
    if (pinError) return setError(pinError);
    if (!editing && !photoUrl.trim()) return setError('La URL de la foto es obligatoria.');
    const year = parseInt(joinYear, 10);
    if (!(year >= 2000 && year <= currentYear)) return setError(`El año debe estar entre 2000 y ${currentYear}.`);
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return setError('La fecha de nacimiento va como AAAA-MM-DD.');
    if (isSelf && role !== 'Comision') return setError('No podés quitarte el rol de Comisión a vos mismo. Pedíselo a otro miembro.');

    if (editing && player.role !== role) {
      const ok = await confirmAction(
        'Cambiar rol',
        `${firstName} pasa de ${ROLE_LABEL[player.role]} a ${ROLE_LABEL[role]}.${
          role === 'Enfermo' ? ' Pierde el acceso al panel de Comisión.' : ' Tendrá acceso completo al panel de Comisión.'
        }`,
        'Cambiar'
      );
      if (!ok) return;
    }

    setSaving(true);
    try {
      const body = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        aliases: aliases.map((a) => a.trim()).filter(Boolean),
        pin: pin ? normalizePin(pin) : undefined,
        birthDate: birthDate || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        joinYear: year,
      };
      await apiFetch(editing ? `/api/players/${player.id}` : '/api/players', { method: editing ? 'PUT' : 'POST', json: body });
      refresh.players();
      router.back();
    } catch (e) {
      const msg = errorMessage(e, 'Error al guardar el jugador');
      setError(/PIN/i.test(msg) && /uso/i.test(msg) ? `${msg}. Elegí otra clave.` : msg);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!player) return;
    if (isSelf) return setError('No podés inactivarte a vos mismo.');
    const ok = await confirmAction(
      'Inactivar jugador',
      `${player.firstName} ${player.lastName} deja de aparecer en el directorio y no puede entrar. Su historia se conserva.`,
      'Inactivar'
    );
    if (!ok) return;
    setSaving(true);
    try {
      await apiFetch(`/api/players/${player.id}`, { method: 'DELETE' });
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
      <NoirCard className="flex-row items-center gap-4 p-4">
        <PlayerAvatar {...avatarProps({ firstName: firstName || '?', lastName, photoUrl: photoUrl || null, role })} size={64} ringColor={noir.gold} />
        <View className="flex-1">
          <Text className="font-cinzel-bold text-lg text-noir-text">{`${firstName} ${lastName}`.trim() || 'Nuevo jugador'}</Text>
          <Text className="font-inter text-sm text-noir-muted">{ROLE_LABEL[role]}</Text>
        </View>
      </NoirCard>

      <NoirCard className="gap-4 p-4">
        <Field label="Nombre *" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
        <Field label="Apellido *" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
        <Field
          label={editing ? 'Nueva clave (opcional)' : 'Clave de acceso'}
          value={pin}
          onChangeText={(t) => setPin(t.slice(0, PIN_MAX_LENGTH))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={editing ? 'Vacía = no se cambia' : 'Clave'}
          hint={PIN_RULE_TEXT}
          error={pinError}
        />
        <View className="gap-1.5">
          <Overline className="text-[11px]">Rol *</Overline>
          <Segmented
            options={[
              { id: 'Enfermo', label: 'Enfermo' },
              { id: 'Comision', label: 'Comisión' },
            ]}
            value={role}
            onChange={setRole}
          />
        </View>
        <Field
          label={editing ? 'URL de la foto' : 'URL de la foto *'}
          value={photoUrl}
          onChangeText={setPhotoUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder="https://…"
        />
        <View className="gap-2">
          <Overline className="text-[11px]">Alias</Overline>
          {aliases.map((a, i) => (
            <View key={i} className="flex-row items-center gap-2">
              <View className="flex-1">
                <Field
                  label={`Alias ${i + 1}`}
                  value={a}
                  onChangeText={(t) => setAliases(aliases.map((x, j) => (j === i ? t : x)))}
                />
              </View>
              {aliases.length > 1 ? (
                <NoirButton title="Quitar" variant="ghost" onPress={() => setAliases(aliases.filter((_, j) => j !== i))} />
              ) : null}
            </View>
          ))}
          <NoirButton title="Agregar alias" variant="ghost" onPress={() => setAliases([...aliases, ''])} />
        </View>
      </NoirCard>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: more }}
        onPress={() => setMore(!more)}
        className="min-h-[44px] justify-center">
        <Text className="font-inter-semibold text-sm text-noir-gold">{more ? 'Ocultar información adicional' : 'Más información'}</Text>
      </Pressable>
      {more ? (
        <NoirCard className="gap-4 p-4">
          <Field label="Fecha de nacimiento" value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-DD" keyboardType="numbers-and-punctuation" />
          <Field label="Teléfono" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0999123456" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="email@ejemplo.com" />
          <Field label="Enfermo desde" value={joinYear} onChangeText={(t) => setJoinYear(t.replace(/[^0-9]/g, '').slice(0, 4))} keyboardType="number-pad" />
        </NoirCard>
      ) : null}

      <FormError message={error} />
      <NoirButton title={editing ? 'Guardar cambios' : 'Crear jugador'} size="lg" loading={saving} onPress={save} />
      {editing && player.isActive !== false && !isSelf ? (
        <NoirButton title="Inactivar jugador" variant="ghost" disabled={saving} onPress={deactivate} />
      ) : null}
    </View>
  );
}
