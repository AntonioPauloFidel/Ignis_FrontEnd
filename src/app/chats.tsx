import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createChat, deleteChat, listChats, type ChatSummary } from '../api/chat';
import { colors } from '../constants/colors';

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Chats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setChats(await listChats());
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Token')) {
        router.replace('/login');
        return;
      }
      setError(message || 'Não foi possível carregar suas conversas.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleNewChat() {
    try {
      setCreating(true);
      const chat = await createChat();
      router.push(`/chat/${chat._id}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o chat.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteChat(id);
      setChats((current) => current.filter((chat) => chat._id !== id));
    } catch {
      setError('Não foi possível excluir a conversa.');
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.darkBlue} />
        </Pressable>
        <Text style={styles.title}>Conversas com a IA</Text>
        <View style={{ width: 26 }} />
      </View>

      <Pressable style={styles.newButton} onPress={handleNewChat} disabled={creating}>
        {creating ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />
            <Text style={styles.newButtonText}>Novo chat</Text>
          </>
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(chat) => chat._id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Nenhuma conversa ainda. Toque em &quot;Novo chat&quot; para começar e envie um PDF ou
              DOCX para estudar.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() => router.push(`/chat/${item._id}` as never)}
            >
              <View style={styles.itemIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemDate}>{formatDate(item.updatedAt)}</Text>
              </View>
              <Pressable onPress={() => handleDelete(item._id)} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color="#94A3B8" />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.darkBlue },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    marginBottom: 16,
  },
  newButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  error: { color: '#DC2626', marginBottom: 8 },
  empty: { color: colors.neutralGray, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.lightGray,
    marginBottom: 10,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.darkBlue },
  itemDate: { fontSize: 12, color: colors.neutralGray, marginTop: 2 },
});
