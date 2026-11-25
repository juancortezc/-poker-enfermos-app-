/**
 * Crear o editar una propuesta. Equivale a components/proposals/ProposalForm.tsx
 * de la web: título, objetivo, situación, propuesta e imagen opcional. La
 * imagen se elige de la galería (o se pega una URL, como en la web).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { cp } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { pickProposalImage, PROPOSAL_LIMITS, safeImageUri, saveProposal, type Proposal, type ProposalInput } from './api';

const isValidUrl = (value: string) => safeImageUri(value) !== null;

type Props = {
  initial?: Proposal | null;
  onSaved: () => void;
  onCancel: () => void;
};

type TextField = 'title' | 'objective' | 'situation' | 'proposal';

const FIELDS: { key: TextField; label: string; placeholder: string; multiline: boolean }[] = [
  { key: 'title', label: 'Título', placeholder: 'Un nombre corto para tu propuesta', multiline: false },
  { key: 'objective', label: 'Objetivo', placeholder: '¿Qué se busca lograr?', multiline: true },
  { key: 'situation', label: 'Situación a modificar', placeholder: '¿Qué pasa hoy y por qué cambiarlo?', multiline: true },
  { key: 'proposal', label: 'Propuesta', placeholder: 'El cambio concreto que proponés', multiline: true },
];


export function ProposalForm({ initial, onSaved, onCancel }: Props) {
  const c = useCP();
  const editing = !!initial;
  const [form, setForm] = useState<Record<TextField, string>>({
    title: initial?.title ?? '',
    objective: initial?.objective ?? '',
    situation: initial?.situation ?? '',
    proposal: initial?.proposal ?? '',
  });
  const [imageUrl, setImageUrl] = useState<string>(initial?.imageUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const valid = FIELDS.every((f) => form[f.key].trim().length > 0);

  const pick = async () => {
    setPicking(true);
    try {
      const result = await pickProposalImage();
      if (!result) return;
      if ('error' in result) Alert.alert('Imagen', result.error);
      else setImageUrl(result.uri);
    } catch {
      Alert.alert('Imagen', 'No se pudo abrir la imagen.');
    } finally {
      setPicking(false);
    }
  };

  const submit = async () => {
    if (!valid) {
      Alert.alert('Faltan datos', 'Todos los campos menos la imagen son obligatorios.');
      return;
    }
    const image = imageUrl.trim();
    if (image && !isValidUrl(image)) {
      Alert.alert('Imagen', 'La URL de la imagen tiene que empezar con https://');
      return;
    }
    const input: ProposalInput = {
      title: form.title.trim(),
      objective: form.objective.trim(),
      situation: form.situation.trim(),
      proposal: form.proposal.trim(),
      imageUrl: image || null,
    };
    setSaving(true);
    try {
      await saveProposal(input, initial?.id);
      onSaved();
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CPCard className="gap-4">
      <View className="gap-1">
        <Overline>{editing ? 'Editar' : 'Nueva'} propuesta</Overline>
        <Title className="text-xl">{editing ? initial?.title : 'Para el próximo torneo'}</Title>
      </View>

      {FIELDS.map((field) => {
        const limit = PROPOSAL_LIMITS[field.key];
        const value = form[field.key];
        return (
          <View key={field.key} className="gap-1.5">
            <View className="flex-row items-baseline justify-between">
              <Overline>{field.label} *</Overline>
              <Muted className="text-xs">
                {value.length}/{limit}
              </Muted>
            </View>
            <TextInput
              value={value}
              onChangeText={(text) => setForm((prev) => ({ ...prev, [field.key]: text }))}
              placeholder={field.placeholder}
              placeholderTextColor={c.onSurfaceVariant}
              maxLength={limit}
              multiline={field.multiline}
              className={`rounded-cp border border-cp-surface-3 bg-cp-surface-0 px-3 py-2.5 font-inter text-base text-cp-on-surface ${
                field.multiline ? 'min-h-[96px]' : 'min-h-[48px]'
              }`}
              style={field.multiline ? { textAlignVertical: 'top' } : undefined}
            />
          </View>
        );
      })}

      <View className="gap-2">
        <Overline>Imagen (opcional)</Overline>
        {imageUrl && isValidUrl(imageUrl) ? (
          <View>
            <Image
              source={{ uri: imageUrl }}
              style={{ width: '100%', height: 180, borderRadius: 5, backgroundColor: c.surface0 }}
              contentFit="contain"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar imagen"
              onPress={() => setImageUrl('')}
              className="absolute right-2 top-2 h-11 w-11 items-center justify-center rounded-full bg-black/70">
              <Ionicons name="close" size={22} color={cp.onSurface} />
            </Pressable>
          </View>
        ) : null}
        <CPButton
          title={imageUrl ? 'Cambiar imagen' : 'Elegir de la galería'}
          variant="outline"
          loading={picking}
          onPress={pick}
          icon={<Ionicons name="image-outline" size={18} color={c.onSurface} />}
        />
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="…o pegá una URL https://"
          placeholderTextColor={c.onSurfaceVariant}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="min-h-[48px] rounded-cp border border-cp-surface-3 bg-cp-surface-0 px-3 font-inter text-base text-cp-on-surface"
        />
      </View>

      <View className="flex-row gap-3">
        <CPButton title="Cancelar" variant="ghost" onPress={onCancel} className="flex-1" />
        <CPButton
          title={editing ? 'Guardar' : 'Publicar'}
          onPress={submit}
          loading={saving}
          disabled={!valid}
          className="flex-1"
        />
      </View>
      <Text className="font-inter text-xs text-cp-on-surface-muted">* Obligatorio</Text>
    </CPCard>
  );
}
