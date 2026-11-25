/**
 * Edición de la estructura de blinds: la tabla Nivel/SB/BB/Min de la web
 * (TournamentForm, CPBlindsTab y el paso Config de CPCrearTorneoTab) más
 * agregar y quitar niveles, presets y volver a la estructura del grupo
 * (`defaultBlindLevels()` de @poker/shared, 18 niveles).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { defaultBlindLevels, TOURNAMENT_PRESETS, validateBlindLevels, type BlindLevel } from '@poker/shared';
import { Pressable, Text, TextInput, View } from 'react-native';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { CPButton } from '@/components/ui/CPButton';
import { Muted } from '@/components/ui/Typography';
import { fonts } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { confirmAction } from './api';
import { toInt } from './Form';

type Props = {
  levels: BlindLevel[];
  onChange: (levels: BlindLevel[]) => void;
  disabled?: boolean;
};

const renumber = (levels: BlindLevel[]) => levels.map((l, i) => ({ ...l, level: i + 1 }));

export function BlindLevelsEditor({ levels, onChange, disabled = false }: Props) {
  const c = useCP();
  const issues = validateBlindLevels(levels);
  const errors = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');
  const totalMin = levels.reduce((s, l) => s + l.duration, 0);

  const update = (index: number, field: 'smallBlind' | 'bigBlind' | 'duration', text: string) => {
    onChange(levels.map((l, i) => (i === index ? { ...l, [field]: toInt(text) } : l)));
  };

  const remove = async (index: number) => {
    const ok = await confirmAction('Quitar nivel', `¿Quitar el nivel ${levels[index].level}? Los siguientes se renumeran.`, 'Quitar');
    if (ok) onChange(renumber(levels.filter((_, i) => i !== index)));
  };

  const add = () => {
    const last = levels[levels.length - 1];
    const next: BlindLevel = last
      ? { level: levels.length + 1, smallBlind: last.smallBlind * 2, bigBlind: last.bigBlind * 2, duration: last.duration || 10 }
      : { level: 1, smallBlind: 50, bigBlind: 100, duration: 12 };
    onChange([...levels, next]);
  };

  const restore = async () => {
    const ok = await confirmAction(
      'Restaurar blinds',
      'Se reemplazan los niveles por la estructura estándar del grupo (18 niveles).',
      'Restaurar'
    );
    if (ok) onChange(defaultBlindLevels());
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-2">
        <OptionPicker
          label="Preset"
          value={null}
          placeholder="Cargar preset…"
          options={TOURNAMENT_PRESETS.map((p) => ({ value: p.id, label: `${p.name} · ${p.blindLevels.length} niveles`, hint: p.estimatedDuration }))}
          onChange={async (id) => {
            const preset = TOURNAMENT_PRESETS.find((p) => p.id === id);
            if (!preset) return;
            const ok = await confirmAction('Cargar preset', `Se reemplazan los niveles por "${preset.name}".`, 'Cargar', false);
            if (ok) onChange(preset.blindLevels.map((l) => ({ ...l })));
          }}
        />
        <CPButton title="Estándar" variant="outline" onPress={restore} disabled={disabled} />
      </View>

      <Muted className="text-xs">
        {levels.length} niveles · {Math.floor(totalMin / 60)} h {totalMin % 60} min sin contar el último. Duración 0 = sin límite.
      </Muted>

      <View className="flex-row gap-2 px-1">
        <HeadCell label="Nv" width={28} />
        <HeadCell label="Chica" flex />
        <HeadCell label="Grande" flex />
        <HeadCell label="Min" width={56} />
        <View style={{ width: 36 }} />
      </View>

      {levels.map((l, i) => {
        const rowError = errors.some((e) => e.field.startsWith(`blindLevel-${i}-`));
        return (
          <View key={i} className="flex-row items-center gap-2">
            <Text className="text-center font-display text-sm text-cp-on-surface-variant" style={{ width: 28 }}>
              {l.level}
            </Text>
            <NumberCell value={l.smallBlind} onChange={(t) => update(i, 'smallBlind', t)} label={`Ciega chica nivel ${l.level}`} error={rowError} disabled={disabled} />
            <NumberCell value={l.bigBlind} onChange={(t) => update(i, 'bigBlind', t)} label={`Ciega grande nivel ${l.level}`} error={rowError} disabled={disabled} />
            <NumberCell value={l.duration} onChange={(t) => update(i, 'duration', t)} label={`Minutos nivel ${l.level}`} width={56} disabled={disabled} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Quitar nivel ${l.level}`}
              disabled={disabled}
              onPress={() => remove(i)}
              hitSlop={6}
              className="h-11 w-9 items-center justify-center">
              <Ionicons name="remove-circle-outline" size={20} color={c.onSurfaceVariant} />
            </Pressable>
          </View>
        );
      })}

      <CPButton title="Agregar nivel" variant="ghost" onPress={add} disabled={disabled} />

      {errors.length > 0 ? (
        <View className="gap-1">
          {errors.slice(0, 4).map((e) => (
            <Text key={e.field + e.message} className="font-inter text-xs text-cp-primary-light">
              • {e.message}
            </Text>
          ))}
        </View>
      ) : null}
      {warnings.length > 0 ? (
        <View className="gap-1">
          {warnings.slice(0, 3).map((w) => (
            <Text key={w.field + w.message} className="font-inter text-xs text-cp-warning">
              • {w.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function HeadCell({ label, width, flex }: { label: string; width?: number; flex?: boolean }) {
  return (
    <Text
      className="text-center font-inter-semibold text-[11px] uppercase tracking-[1px] text-cp-on-surface-muted"
      style={flex ? { flex: 1 } : { width }}>
      {label}
    </Text>
  );
}

function NumberCell({
  value,
  onChange,
  label,
  width,
  error = false,
  disabled = false,
}: {
  value: number;
  onChange: (text: string) => void;
  label: string;
  width?: number;
  error?: boolean;
  disabled?: boolean;
}) {
  const c = useCP();
  return (
    <TextInput
      value={String(value)}
      onChangeText={onChange}
      keyboardType="number-pad"
      selectTextOnFocus
      editable={!disabled}
      accessibilityLabel={label}
      style={[
        {
          minHeight: 44,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: error ? c.primary : c.surfaceBorder,
          backgroundColor: c.surface1,
          textAlign: 'center',
          fontFamily: fonts.bodyMedium,
          fontSize: 15,
          color: c.onSurface,
        },
        width ? { width } : { flex: 1 },
      ]}
    />
  );
}
