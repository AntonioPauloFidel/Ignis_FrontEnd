import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { deleteAllChats } from '../../api/chat';
import { colors } from '../../constants/colors';

/** Aviso mostrado no primeiro uso do chat com IA. */
export function PrivacyNotice({ onAccept }: { onAccept: () => void }) {
  return (
    <View style={styles.noticeBackdrop}>
      <View style={styles.noticeCard} accessibilityRole="alert">
        <View style={styles.noticeIcon}>
          <Ionicons name="shield-checkmark-outline" size={26} color={colors.primary} />
        </View>
        <Text style={styles.noticeTitle}>Como a IA usa seus dados</Text>
        <Text style={styles.noticeText}>
          Suas mensagens e os arquivos que você envia são processados por um provedor externo de IA para gerar as
          respostas. Evite enviar dados pessoais sensíveis. Você pode apagar tudo a qualquer momento no menu de
          conversas.
        </Text>
        <Pressable style={styles.noticeButton} onPress={onAccept} accessibilityRole="button">
          <Text style={styles.noticeButtonText}>Entendi</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Botão do menu de conversas para apagar todos os dados de IA, com confirmação. */
export function DeleteDataButton({ onDeleted }: { onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function confirm() {
    setDeleting(true);
    setMessage('');

    try {
      await deleteAllChats();
      setConfirming(false);
      setFailed(false);
      setMessage('Pronto! Todos os seus dados de IA foram apagados.');
      onDeleted();
    } catch (e) {
      setFailed(true);
      setMessage((e as Error).message || 'Não foi possível apagar seus dados.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.footer}>
      {message ? <Text style={[styles.feedback, failed && { color: '#DC2626' }]}>{message}</Text> : null}

      {confirming ? (
        <View style={styles.confirmBox}>
          <Text style={styles.confirmText}>
            Apagar todas as conversas, arquivos e materiais de estudo? Isso não pode ser desfeito.
          </Text>
          <View style={styles.confirmRow}>
            <Pressable style={styles.keep} onPress={() => setConfirming(false)} disabled={deleting}>
              <Text style={styles.keepText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.erase} onPress={confirm} disabled={deleting} accessibilityRole="button">
              {deleting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.eraseText}>Apagar tudo</Text>}
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          style={styles.trigger}
          onPress={() => {
            setMessage('');
            setConfirming(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Apagar todos os meus dados de IA"
        >
          <Ionicons name="trash-outline" size={16} color="#DC2626" />
          <Text style={styles.triggerText}>Apagar todos os meus dados de IA</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  noticeBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 30,
  },
  noticeCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22, alignItems: 'center', gap: 10 },
  noticeIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 18, fontWeight: '800', color: colors.darkBlue, textAlign: 'center' },
  noticeText: { fontSize: 14, lineHeight: 21, color: '#475569', textAlign: 'center' },
  noticeButton: { alignSelf: 'stretch', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  noticeButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  footer: { paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 8 },
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  triggerText: { color: '#DC2626', fontSize: 13, fontWeight: '600', flexShrink: 1 },
  feedback: { color: '#15803D', fontSize: 12, lineHeight: 17 },
  confirmBox: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 12, gap: 10 },
  confirmText: { color: '#991B1B', fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  confirmRow: { flexDirection: 'row', gap: 8 },
  keep: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#FCA5A5' },
  keepText: { color: '#991B1B', fontWeight: '700', fontSize: 13 },
  erase: { flex: 1, backgroundColor: '#DC2626', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  eraseText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
});
