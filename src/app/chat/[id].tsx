import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getChat,
  sendMessageStream,
  uploadChatFile,
  type ChatFile,
  type ChatMessage,
} from '../../api/chat';
import { colors } from '../../constants/colors';

// Renderiza só o básico de markdown que a IA usa: **negrito** e listas
function FormattedText({ text, color }: { text: string; color: string }) {
  const lines = text.split('\n').map((line) => line.replace(/^\s*[-*]\s+/, '• ').replace(/^#+\s*/, ''));

  return (
    <Text style={{ color, fontSize: 15, lineHeight: 22 }}>
      {lines.map((line, lineIndex) => (
        <Text key={lineIndex}>
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <Text key={index} style={{ fontWeight: '700' }}>
                {part.slice(2, -2)}
              </Text>
            ) : (
              part
            ),
          )}
          {lineIndex < lines.length - 1 ? '\n' : ''}
        </Text>
      ))}
    </Text>
  );
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [title, setTitle] = useState('Chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getChat(id)
      .then((chat) => {
        setTitle(chat.title);
        setMessages(chat.messages);
        setFiles(chat.files);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : '';
        if (message.includes('Token')) router.replace('/login');
        else setError(message || 'Não foi possível abrir a conversa.');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    setInput('');
    setError('');
    setSending(true);
    setMessages((current) => [
      ...current,
      { role: 'user', content },
      { role: 'assistant', content: '' },
    ]);

    try {
      await sendMessageStream(id, content, (piece) => {
        setMessages((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + piece };
          return next;
        });
      });
      if (title === 'Chat' || title === 'Novo chat') setTitle(content.slice(0, 50));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a mensagem.');
      // remove a resposta vazia; o backend também descarta a pergunta sem resposta
      setMessages((current) =>
        current[current.length - 1]?.content === '' ? current.slice(0, -2) : current,
      );
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  async function handleAttach() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];

    try {
      setUploading(true);
      setError('');
      const file = await uploadChatFile(id, {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        file: asset.file,
      });
      setFiles((current) => [...current, file]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + 8 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.darkBlue} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {files.length > 0 ? (
        <View style={styles.files}>
          {files.map((file) => (
            <View key={file._id} style={styles.fileChip}>
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              <Text style={styles.fileName} numberOfLines={1}>
                {file.name}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={styles.empty}>
              Pergunte qualquer coisa sobre seus estudos, ou toque no clipe para enviar um PDF/DOCX
              e estudar com a IA. Tente: &quot;Quantas horas estudei essa semana?&quot;
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {item.content ? (
                  <FormattedText text={item.content} color={mine ? '#FFFFFF' : colors.darkBlue} />
                ) : (
                  <ActivityIndicator size="small" color={colors.primary} />
                )}
              </View>
            );
          }}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable onPress={handleAttach} disabled={uploading} hitSlop={8}>
          {uploading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Ionicons name="attach" size={26} color={colors.primary} />
          )}
        </Pressable>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Pergunte à IA..."
          placeholderTextColor="#94A3B8"
          multiline
          editable={!sending}
          onSubmitEditing={handleSend}
        />
        <Pressable
          style={[styles.send, (!input.trim() || sending) && { opacity: 0.4 }]}
          onPress={handleSend}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.darkBlue },
  files: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 20, marginBottom: 6 },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
    maxWidth: 220,
  },
  fileName: { fontSize: 12, color: colors.primary },
  list: { padding: 20, gap: 10, flexGrow: 1 },
  empty: { color: colors.neutralGray, textAlign: 'center', marginTop: 40, lineHeight: 22 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.lightGray, borderBottomLeftRadius: 4 },
  error: { color: '#DC2626', paddingHorizontal: 20, paddingBottom: 6 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    color: colors.darkBlue,
    fontSize: 15,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
