/**
 * Confirmación escrita para lo irreversible, como en la web: terminar un
 * torneo pide "CONFIRMO" y cancelarlo "CANCELAR TORNEO".
 */
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';

import { CPButton } from '@/components/ui/CPButton';
import { Body, Muted, Title } from '@/components/ui/Typography';

import { Field, FormError } from './Form';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  word: string;
  confirmTitle: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

export function TypedConfirm({ visible, title, message, word, confirmTitle, loading, error, onConfirm, onClose, children }: Props) {
  const [text, setText] = useState('');
  const ok = text.trim().toUpperCase() === word;
  const close = () => {
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <Pressable className="flex-1 justify-center bg-black/70 px-5" onPress={loading ? undefined : close} accessibilityLabel="Cerrar">
          <Pressable onPress={() => {}} className="gap-4 rounded-card border border-cp-primary/60 bg-cp-surface-1 p-5">
            <Title className="text-xl">{title}</Title>
            <Body className="text-base">{message}</Body>
            {children}
            <Muted>
              Para confirmar escribí <Muted className="font-inter-bold text-cp-primary-light">{word}</Muted>
            </Muted>
            <Field
              label="Confirmación"
              value={text}
              onChangeText={setText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={word}
            />
            <FormError message={error} />
            <View className="flex-row gap-3">
              <CPButton title="Volver" variant="outline" onPress={close} disabled={loading} className="flex-1" />
              <CPButton title={confirmTitle} variant="primary" onPress={onConfirm} disabled={!ok} loading={loading} className="flex-1" />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
