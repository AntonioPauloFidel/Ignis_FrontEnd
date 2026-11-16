import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  createChat,
  deleteChat,
  deleteChatFile,
  getChat,
  listChats,
  openChatFile,
  renameChat,
  searchChats,
  sendMessageStream,
  setMessageFeedback,
  uploadChatFile,
  type ChatFile,
  type ChatMessage,
  type ChatSearchResult,
  type ChatSummary,
} from '../api/chat';
import { Markdown } from '../components/Markdown';
import { PrivacyNotice, DeleteDataButton } from '../components/PrivacyControls';
import { StudyMaterialPanel } from '../components/StudyMaterial';
import { colors } from '../constants/colors';
import { highlight, searchable, SEARCH_DELAY_MS } from '../utils/chat-search';
import { canRate, toggleFeedback } from '../utils/feedback';
import { acceptNotice, hasAcceptedNotice } from '../utils/privacy-notice';

const NEW_CHAT_TITLE = 'Novo chat';

function formatMinutes(total: number) {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (!hours) return `${minutes}min`;
  return minutes ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Chats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const drawerWidth = Math.min(320, width * 0.85);
  const [drawer] = useState(() => new Animated.Value(0)); // 0 = escondido, 1 = aberto
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<ChatSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const [title, setTitle] = useState(NEW_CHAT_TITLE);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<ChatFile[]>([]);
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [input, setInput] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [opening, setOpening] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [materialOpen, setMaterialOpen] = useState(false);
  const [noticeVisible, setNoticeVisible] = useState(() => !hasAcceptedNotice());

  const handleError = useCallback(
    (err: unknown, fallback: string) => {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Token')) {
        router.replace('/login');
        return;
      }
      setError(message || fallback);
    },
    [router],
  );

  const loadChats = useCallback(async () => {
    try {
      setChats(await listChats());
    } catch (err) {
      handleError(err, 'Não foi possível carregar suas conversas.');
    }
  }, [handleError]);

  useEffect(() => {
    listChats()
      .then(setChats)
      .catch((err) => handleError(err, 'Não foi possível carregar suas conversas.'));
  }, [handleError]);

  // Muda o texto da busca já acertando o estado: abaixo de 2 letras não há busca nem resultado antigo na tela
  function changeSearch(text: string) {
    setSearchText(text);
    setSearchFailed(false);
    setSearching(searchable(text));
    if (!searchable(text)) setSearchResults([]);
  }

  // Busca nas conversas: espera o aluno parar de digitar e ignora respostas de buscas que já ficaram para trás
  useEffect(() => {
    if (!searchable(searchText)) return;

    const controller = new AbortController();

    const timer = setTimeout(() => {
      searchChats(searchText.trim(), controller.signal)
        .then((results) => {
          setSearchResults(results);
          setSearching(false);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setSearchResults([]);
          setSearchFailed(true);
          setSearching(false);
          if (err instanceof Error && err.message.includes('Token')) router.replace('/login');
        });
    }, SEARCH_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchText, router]);

  function toggleDrawer(open: boolean) {
    setDrawerOpen(open);
    if (!open) changeSearch('');
    Animated.timing(drawer, {
      toValue: open ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    if (open) loadChats();
  }

  function startNewChat() {
    setChatId(null);
    setTitle(NEW_CHAT_TITLE);
    setMessages([]);
    setFiles([]);
    setStudyMinutes(0);
    setError('');
    toggleDrawer(false);
  }

  // Depois de apagar tudo: limpa a tela, mas deixa o menu aberto para mostrar a confirmação
  function handleAllDeleted() {
    setChats([]);
    setChatId(null);
    setTitle(NEW_CHAT_TITLE);
    setMessages([]);
    setFiles([]);
    setStudyMinutes(0);
    setMaterialOpen(false);
    setError('');
  }

  async function openChat(id: string) {
    toggleDrawer(false);
    if (id === chatId) return;

    try {
      setOpening(true);
      setError('');
      const chat = await getChat(id);
      setChatId(chat.id);
      setTitle(chat.title);
      setMessages(chat.messages);
      setFiles(chat.files);
      setStudyMinutes(chat.studyMinutes);
    } catch (err) {
      handleError(err, 'Não foi possível abrir a conversa.');
    } finally {
      setOpening(false);
    }
  }

  async function removeChat(id: string) {
    try {
      await deleteChat(id);
      setChats((current) => current.filter((chat) => chat._id !== id));
      if (id === chatId) startNewChat();
    } catch {
      setError('Não foi possível excluir a conversa.');
    }
  }

  // O chat só é criado no servidor quando o aluno manda a primeira mensagem ou arquivo
  async function ensureChat(): Promise<string> {
    if (chatId) return chatId;
    const chat = await createChat();
    setChatId(chat._id);
    return chat._id;
  }

  async function handleSend() {
    const content = input.trim();
    if (!content || sending) return;

    const controller = new AbortController();
    abortRef.current = controller;

    setInput('');
    setError('');
    setSending(true);
    setMessages((current) => [
      ...current,
      { role: 'user', content },
      { role: 'assistant', content: '' },
    ]);

    try {
      const id = await ensureChat();
      let received = false;

      await sendMessageStream(id, content, (piece) => {
        received = true;
        setMessages((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + piece };
          return next;
        });
      }, controller.signal, (sources) => {
        setMessages((current) => {
          const next = [...current];
          next[next.length - 1] = { ...next[next.length - 1], sources };
          return next;
        });
      });

      // Parou antes de chegar qualquer texto: o back descarta a pergunta, então devolve ao campo
      if (controller.signal.aborted && !received) {
        setMessages((current) => current.slice(0, -2));
        setInput(content);
        return;
      }

      if (title === NEW_CHAT_TITLE) setTitle(content.slice(0, 50));
      loadChats();
      // "estudei 2h" soma tempo no chat; atualiza o contador
      // e traz do servidor o id e o estado das mensagens, para a resposta nova poder receber 👍/👎
      getChat(id)
        .then((chat) => {
          setStudyMinutes(chat.studyMinutes);
          setMessages((current) => (chat.messages.length === current.length ? chat.messages : current));
        })
        .catch(() => undefined);
    } catch (err) {
      handleError(err, 'Não foi possível enviar a mensagem.');
      // tira a resposta vazia; o backend também descarta a pergunta sem resposta
      setMessages((current) =>
        current[current.length - 1]?.content === '' ? current.slice(0, -2) : current,
      );
      setInput(content);
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }

  // 👍/👎: muda na hora e volta ao estado anterior se o servidor não aceitar
  async function handleFeedback(messageId: string, pressed: 'up' | 'down') {
    if (!chatId) return;

    const previous = messages.find((message) => message._id === messageId)?.feedback ?? null;
    const next = toggleFeedback(previous, pressed);
    const apply = (feedback: 'up' | 'down' | null) =>
      setMessages((current) => current.map((message) => (message._id === messageId ? { ...message, feedback } : message)));

    apply(next);

    try {
      await setMessageFeedback(chatId, messageId, next);
    } catch (err) {
      apply(previous);
      // Falha de rede não mostra texto técnico; sessão expirada continua levando ao login
      const expired = err instanceof Error && err.message.includes('Token');
      handleError(expired ? err : null, 'Não foi possível salvar a avaliação.');
    }
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  function startRenaming() {
    if (!chatId) return;
    setTitleDraft(title);
    setEditingTitle(true);
  }

  async function saveTitle() {
    const next = titleDraft.trim();
    setEditingTitle(false);

    if (!chatId || !next || next === title) return;

    try {
      const renamed = await renameChat(chatId, next);
      setTitle(renamed.title);
      loadChats();
    } catch (err) {
      handleError(err, 'Não foi possível renomear o chat.');
    }
  }

  async function handleAttach() {
    let asset: DocumentPicker.DocumentPickerAsset;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      asset = result.assets[0];
    } catch {
      setError('Não foi possível abrir o seletor de arquivos.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const id = await ensureChat();
      const file = await uploadChatFile(id, {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
        file: asset.file,
      });
      setFiles((current) => [...current, file]);
    } catch (err) {
      handleError(err, 'Não foi possível enviar o arquivo.');
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenFile(file: ChatFile) {
    if (!chatId) return;

    try {
      await openChatFile(chatId, file._id);
    } catch (err) {
      handleError(err, 'Não foi possível abrir o arquivo.');
    }
  }

  async function handleRemoveFile(file: ChatFile) {
    if (!chatId) return;

    try {
      await deleteChatFile(chatId, file._id);
      setFiles((current) => current.filter((item) => item._id !== file._id));
    } catch (err) {
      handleError(err, 'Não foi possível remover o arquivo.');
    }
  }

  const translateX = drawer.interpolate({ inputRange: [0, 1], outputRange: [drawerWidth, 0] });
  const overlayOpacity = drawer.interpolate({ inputRange: [0, 1], outputRange: [0, 0.35] });

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={[styles.screen, { paddingTop: insets.top + 8 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.darkBlue} />
          </Pressable>

          <View style={styles.titleBox}>
            {editingTitle ? (
              <TextInput
                style={styles.titleInput}
                value={titleDraft}
                onChangeText={setTitleDraft}
                onSubmitEditing={saveTitle}
                onBlur={saveTitle}
                maxLength={80}
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
              />
            ) : (
              <Pressable onPress={startRenaming} disabled={!chatId} style={styles.titleRow} hitSlop={6}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {chatId ? <Ionicons name="pencil" size={12} color={colors.primary} /> : null}
              </Pressable>
            )}
            {studyMinutes > 0 ? (
              <Text style={styles.studyTime}>{formatMinutes(studyMinutes)} de estudo</Text>
            ) : null}
          </View>

          <View style={styles.headerActions}>
            {chatId && files.length > 0 ? (
              <Pressable
                onPress={() => setMaterialOpen(true)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Gerar material de estudo"
              >
                <Ionicons name="school-outline" size={24} color={colors.primary} />
              </Pressable>
            ) : null}
            <Pressable onPress={startNewChat} hitSlop={8}>
              <Ionicons name="create-outline" size={24} color={colors.primary} />
            </Pressable>
            <Pressable onPress={() => toggleDrawer(true)} hitSlop={8}>
              <Ionicons name="time-outline" size={24} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {files.length > 0 ? (
          <View style={styles.files}>
            {files.map((file) => (
              <View key={file._id} style={styles.fileChip}>
                <Pressable
                  style={styles.fileOpen}
                  onPress={() => handleOpenFile(file)}
                  disabled={!file.hasOriginal}
                >
                  <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleRemoveFile(file)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={colors.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {opening ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="flame" size={34} color={colors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Como posso ajudar nos estudos?</Text>
                <Text style={styles.empty}>
                  Envie um PDF ou DOCX pelo clipe, ou pergunte qualquer coisa. Tente:
                  &quot;Quantas horas estudei essa semana?&quot;
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const mine = item.role === 'user';
              const rateable = canRate(item, sending && index === messages.length - 1);
              return (
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  {item.content ? (
                    mine ? (
                      <Text style={styles.myText}>{item.content}</Text>
                    ) : (
                      <Markdown text={item.content} color={colors.darkBlue} />
                    )
                  ) : (
                    <ActivityIndicator size="small" color={colors.primary} />
                  )}

                  {!mine && item.sources?.length ? (
                    <View style={styles.sources}>
                      <Text style={styles.sourcesLabel}>Fontes</Text>
                      {item.sources.map((source) => (
                        <View key={`${source.file}-${source.page ?? 0}`} style={styles.sourceChip}>
                          <Ionicons name="document-text-outline" size={12} color={colors.primary} />
                          <Text style={styles.sourceText} numberOfLines={1}>
                            {source.file}
                            {source.page ? ` · p. ${source.page}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {rateable ? (
                    <View style={styles.feedbackRow}>
                      {(['up', 'down'] as const).map((value) => {
                        const selected = item.feedback === value;
                        const label = value === 'up' ? 'Resposta boa' : 'Resposta ruim';
                        const icon = value === 'up' ? 'thumbs-up' : 'thumbs-down';

                        return (
                          <Pressable
                            key={value}
                            testID={`feedback-${value}-${item._id}`}
                            accessibilityRole="button"
                            accessibilityLabel={selected ? `${label} (marcada)` : label}
                            accessibilityState={{ selected }}
                            hitSlop={8}
                            style={[styles.feedbackButton, selected && (value === 'up' ? styles.feedbackUp : styles.feedbackDown)]}
                            onPress={() => handleFeedback(item._id!, value)}
                          >
                            <Ionicons
                              name={(selected ? icon : `${icon}-outline`) as 'thumbs-up'}
                              size={15}
                              color={selected ? (value === 'up' ? '#047857' : '#B42318') : '#64748B'}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            }}
          />
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable style={styles.attach} onPress={handleAttach} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Ionicons name="attach" size={24} color={colors.primary} />
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
            // Na web, Enter envia e Shift+Enter quebra a linha
            onKeyPress={(event) => {
              const native = event.nativeEvent as unknown as { key: string; shiftKey?: boolean };
              if (Platform.OS === 'web' && native.key === 'Enter' && !native.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
          />
          {sending ? (
            <Pressable style={styles.send} onPress={handleStop} accessibilityLabel="Parar resposta">
              <Ionicons name="stop" size={16} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.send, !input.trim() && { opacity: 0.4 }]}
              onPress={handleSend}
              disabled={!input.trim()}
            >
              <Ionicons name="send" size={18} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Fundo escurecido: toque para esconder o painel */}
      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[styles.overlay, { opacity: overlayOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => toggleDrawer(false)} />
      </Animated.View>

      {/* Painel de conversas, desliza pela direita */}
      <Animated.View
        pointerEvents={drawerOpen ? 'auto' : 'none'}
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            paddingTop: insets.top + 12,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Conversas</Text>
          <Pressable onPress={() => toggleDrawer(false)} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.darkBlue} />
          </Pressable>
        </View>

        <Pressable style={styles.newButton} onPress={startNewChat}>
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.newButtonText}>Novo chat</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={changeSearch}
            placeholder="Buscar nas conversas"
            placeholderTextColor="#94A3B8"
            accessibilityLabel="Buscar nas conversas"
            returnKeyType="search"
            autoCorrect={false}
            maxLength={100}
          />
          {searchText ? (
            <Pressable onPress={() => changeSearch('')} hitSlop={10} accessibilityLabel="Limpar a busca">
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>

        {searchText.trim() ? (
          <FlatList
            data={searchable(searchText) && !searchFailed ? searchResults : []}
            keyExtractor={(result) => result.chatId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              !searchable(searchText) ? (
                <Text style={styles.drawerEmpty}>Digite pelo menos 2 letras.</Text>
              ) : searching ? (
                <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
              ) : searchFailed ? (
                <Text style={styles.drawerEmpty}>Não foi possível buscar. Tente de novo.</Text>
              ) : (
                <Text style={styles.drawerEmpty}>Nada encontrado para &quot;{searchText.trim()}&quot;.</Text>
              )
            }
            renderItem={({ item }) => (
              <Pressable
                style={[styles.item, item.chatId === chatId && styles.itemActive]}
                onPress={() => openChat(item.chatId)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir conversa ${item.title}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {highlight(item.title, searchText).map((part, index) => (
                      <Text key={index} style={part.match ? styles.highlight : undefined}>
                        {part.text}
                      </Text>
                    ))}
                  </Text>
                  {item.matches.slice(0, 2).map((match) => (
                    <Text key={match.messageId} style={styles.snippet} numberOfLines={2}>
                      {highlight(match.snippet, searchText).map((part, index) => (
                        <Text key={index} style={part.match ? styles.highlight : undefined}>
                          {part.text}
                        </Text>
                      ))}
                    </Text>
                  ))}
                  <Text style={styles.itemDate}>{formatDate(item.updatedAt)}</Text>
                </View>
              </Pressable>
            )}
          />
        ) : (
        <FlatList
          data={chats}
          keyExtractor={(chat) => chat._id}
          ListEmptyComponent={<Text style={styles.drawerEmpty}>Nenhuma conversa ainda.</Text>}
          renderItem={({ item }) => {
            const active = item._id === chatId;
            return (
              <Pressable
                style={[styles.item, active && styles.itemActive]}
                onPress={() => openChat(item._id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, active && { color: colors.primary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.itemDate}>{formatDate(item.updatedAt)}</Text>
                </View>
                <Pressable onPress={() => removeChat(item._id)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </Pressable>
              </Pressable>
            );
          }}
        />
        )}

        <DeleteDataButton onDeleted={handleAllDeleted} />
      </Animated.View>

      {noticeVisible ? (
        <PrivacyNotice
          onAccept={() => {
            acceptNotice();
            setNoticeVisible(false);
          }}
        />
      ) : null}

      {materialOpen && chatId ? (
        <StudyMaterialPanel chatId={chatId} files={files} onClose={() => setMaterialOpen(false)} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 12,
  },
  titleBox: { flex: 1, alignItems: 'center' },
  sources: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  feedbackRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  feedbackButton: {
    width: 30,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  feedbackUp: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  feedbackDown: { backgroundColor: '#FEF3F2', borderColor: '#F5C2BE' },
  sourcesLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.softBlue,
  },
  sourceText: { fontSize: 11, color: colors.primary, flexShrink: 1 },
  myText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%' },
  title: { flexShrink: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.darkBlue },
  titleInput: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.darkBlue,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
    paddingVertical: 0,
  },
  studyTime: { fontSize: 11, color: colors.primary, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
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
  fileOpen: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  fileName: { fontSize: 12, color: colors.primary, flexShrink: 1 },
  list: { padding: 20, gap: 10, flexGrow: 1 },
  emptyBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 12 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.darkBlue, marginBottom: 8 },
  empty: { color: colors.neutralGray, textAlign: 'center', lineHeight: 22 },
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
  attach: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  drawerTitle: { fontSize: 18, fontWeight: '700', color: colors.darkBlue },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    marginBottom: 14,
  },
  newButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.darkBlue, paddingVertical: 0, outlineStyle: 'none' } as object,
  snippet: { fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 17 },
  highlight: { backgroundColor: '#FEF08A', color: colors.darkBlue, fontWeight: '700' },
  drawerEmpty: { color: colors.neutralGray, textAlign: 'center', marginTop: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  itemActive: { backgroundColor: colors.softBlue },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.darkBlue },
  itemDate: { fontSize: 11, color: colors.neutralGray, marginTop: 2 },
});
