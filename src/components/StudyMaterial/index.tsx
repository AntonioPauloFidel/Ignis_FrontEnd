import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  deleteMaterial,
  generateMaterial,
  listMaterial,
  type ChatFile,
  type Flashcard,
  type MaterialType,
  type QuizQuestion,
  type StudyMaterial as Material,
} from '../../api/chat';
import { colors } from '../../constants/colors';
import { quizVerdict, scoreQuiz } from '../../utils/quiz';
import { Markdown } from '../Markdown';

const LABEL: Record<MaterialType, string> = {
  summary: 'Resumo',
  flashcards: 'Flashcards',
  quiz: 'Quiz',
};

const ICON: Record<MaterialType, keyof typeof Ionicons.glyphMap> = {
  summary: 'document-text-outline',
  flashcards: 'albums-outline',
  quiz: 'help-circle-outline',
};

function Flashcards({ cards }: { cards: Flashcard[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  const go = (next: number) => {
    setIndex(next);
    setFlipped(false);
  };

  return (
    <View>
      <Text style={styles.counter}>
        Cartão {index + 1} de {cards.length}
      </Text>
      <Pressable
        style={[styles.card, flipped && styles.cardBack]}
        onPress={() => setFlipped((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={flipped ? 'Mostrar a pergunta' : 'Mostrar a resposta'}
      >
        <Text style={[styles.cardSide, flipped && { color: '#FFFFFF' }]}>{flipped ? 'RESPOSTA' : 'PERGUNTA'}</Text>
        <Text style={[styles.cardText, flipped && { color: '#FFFFFF' }]}>{flipped ? card.back : card.front}</Text>
        <Text style={[styles.cardHint, flipped && { color: '#DBEAFE' }]}>Toque para virar</Text>
      </Pressable>
      <View style={styles.row}>
        <Pressable
          style={[styles.secondary, index === 0 && styles.disabled]}
          onPress={() => go(index - 1)}
          disabled={index === 0}
        >
          <Text style={styles.secondaryText}>Anterior</Text>
        </Pressable>
        <Pressable
          style={[styles.primary, index === cards.length - 1 && styles.disabled]}
          onPress={() => go(index + 1)}
          disabled={index === cards.length - 1}
        >
          <Text style={styles.primaryText}>Próximo</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [finished, setFinished] = useState(false);

  const restart = () => {
    setIndex(0);
    setAnswers(questions.map(() => null));
    setFinished(false);
  };

  if (finished) {
    const result = scoreQuiz(
      questions.map((q) => q.answerIndex),
      answers,
    );

    return (
      <View style={styles.resultBox}>
        <Text style={styles.resultScore}>
          {result.correct} de {result.total}
        </Text>
        <Text style={styles.resultPercent}>{result.percent}% de acerto</Text>
        <Text style={styles.resultText}>{quizVerdict(result.percent)}</Text>
        <Pressable style={styles.primary} onPress={restart}>
          <Text style={styles.primaryText}>Refazer o quiz</Text>
        </Pressable>
      </View>
    );
  }

  const question = questions[index];
  const chosen = answers[index];
  const answered = chosen !== null;
  const last = index === questions.length - 1;

  return (
    <View>
      <Text style={styles.counter}>
        Questão {index + 1} de {questions.length}
      </Text>
      <Text style={styles.question}>{question.question}</Text>

      {question.options.map((option, optionIndex) => {
        const isRight = optionIndex === question.answerIndex;
        const isChosen = chosen === optionIndex;

        return (
          <Pressable
            key={optionIndex}
            disabled={answered}
            onPress={() => setAnswers((current) => current.map((v, i) => (i === index ? optionIndex : v)))}
            style={[
              styles.option,
              answered && isRight && styles.optionRight,
              answered && isChosen && !isRight && styles.optionWrong,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.optionLetter}>{String.fromCharCode(65 + optionIndex)}</Text>
            <Text style={styles.optionText}>{option}</Text>
            {answered && isRight ? <Ionicons name="checkmark-circle" size={20} color="#16A34A" /> : null}
            {answered && isChosen && !isRight ? <Ionicons name="close-circle" size={20} color="#DC2626" /> : null}
          </Pressable>
        );
      })}

      {answered ? (
        <View style={styles.explanation}>
          <Text style={styles.explanationTitle}>{chosen === question.answerIndex ? 'Correto!' : 'Não foi dessa vez'}</Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
        </View>
      ) : null}

      {answered ? (
        <Pressable style={styles.primary} onPress={() => (last ? setFinished(true) : setIndex(index + 1))}>
          <Text style={styles.primaryText}>{last ? 'Ver resultado' : 'Próxima'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function MaterialView({ material }: { material: Material }) {
  if (material.type === 'summary') return <Markdown text={String(material.content)} />;
  if (material.type === 'flashcards') return <Flashcards cards={material.content as Flashcard[]} />;
  return <Quiz questions={material.content as QuizQuestion[]} />;
}

interface Props {
  chatId: string;
  files: ChatFile[];
  onClose: () => void;
}

export function StudyMaterialPanel({ chatId, files, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Material[]>([]);
  const [current, setCurrent] = useState<Material | null>(null);
  const [fileId, setFileId] = useState<string | undefined>(undefined);
  const [loadingList, setLoadingList] = useState(true);
  const [generating, setGenerating] = useState<MaterialType | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState<MaterialType | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await listMaterial(chatId));
    } catch {
      setError('Não foi possível carregar os materiais salvos.');
    } finally {
      setLoadingList(false);
    }
  }, [chatId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generate(type: MaterialType) {
    setError('');
    setRetry(null);
    setGenerating(type);

    try {
      const material = await generateMaterial(chatId, { type, fileId });
      setItems((list) => [material, ...list]);
      setCurrent(material);
    } catch (e) {
      setError((e as Error).message || 'Não foi possível gerar o material.');
      setRetry(type);
    } finally {
      setGenerating(null);
    }
  }

  async function remove(material: Material) {
    try {
      await deleteMaterial(chatId, material._id);
      setItems((list) => list.filter((item) => item._id !== material._id));
      if (current?._id === material._id) setCurrent(null);
    } catch {
      setError('Não foi possível excluir o material.');
    }
  }

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        {current ? (
          <Pressable onPress={() => setCurrent(null)} hitSlop={8} accessibilityLabel="Voltar">
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
        <Text style={styles.headerTitle}>{current ? LABEL[current.type] : 'Material de estudo'}</Text>
        <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Fechar material de estudo">
          <Ionicons name="close" size={26} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {current ? (
          <MaterialView key={current._id} material={current} />
        ) : (
          <>
            {files.length > 1 ? (
              <View style={styles.filePicker}>
                <Text style={styles.sectionLabel}>Gerar a partir de</Text>
                <View style={styles.chips}>
                  <Pressable style={[styles.chip, !fileId && styles.chipActive]} onPress={() => setFileId(undefined)}>
                    <Text style={[styles.chipText, !fileId && styles.chipTextActive]}>Todos os arquivos</Text>
                  </Pressable>
                  {files.map((file) => (
                    <Pressable
                      key={file._id}
                      style={[styles.chip, fileId === file._id && styles.chipActive]}
                      onPress={() => setFileId(file._id)}
                    >
                      <Text style={[styles.chipText, fileId === file._id && styles.chipTextActive]} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Gerar novo</Text>
            <View style={styles.generateRow}>
              {(Object.keys(LABEL) as MaterialType[]).map((type) => (
                <Pressable
                  key={type}
                  style={[styles.generate, generating !== null && styles.disabled]}
                  onPress={() => generate(type)}
                  disabled={generating !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Gerar ${LABEL[type]}`}
                >
                  {generating === type ? (
                    <ActivityIndicator color={colors.primary} />
                  ) : (
                    <Ionicons name={ICON[type]} size={26} color={colors.primary} />
                  )}
                  <Text style={styles.generateText}>{LABEL[type]}</Text>
                </Pressable>
              ))}
            </View>

            {generating ? <Text style={styles.hint}>Gerando {LABEL[generating].toLowerCase()}... pode levar alguns segundos.</Text> : null}

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
                {retry ? (
                  <Pressable onPress={() => generate(retry)} accessibilityRole="button">
                    <Text style={styles.retry}>Tentar de novo</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Salvos neste chat</Text>
            {loadingList ? <ActivityIndicator color={colors.primary} style={{ marginTop: 12 }} /> : null}
            {!loadingList && items.length === 0 ? (
              <Text style={styles.hint}>Nada por aqui ainda. Gere um resumo, flashcards ou quiz.</Text>
            ) : null}
            {items.map((item) => (
              <View key={item._id} style={styles.saved}>
                <Pressable style={styles.savedOpen} onPress={() => setCurrent(item)} accessibilityRole="button">
                  <Ionicons name={ICON[item.type]} size={20} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.savedTitle}>{LABEL[item.type]}</Text>
                    <Text style={styles.savedMeta} numberOfLines={1}>
                      {item.fileName ? `${item.fileName} · ` : ''}
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => remove(item)} hitSlop={8} accessibilityLabel={`Excluir ${LABEL[item.type]}`}>
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </Pressable>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#FFFFFF', zIndex: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.darkBlue },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  filePicker: { marginBottom: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.softBlue, maxWidth: '100%' },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 12, color: colors.primary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  generateRow: { flexDirection: 'row', gap: 10 },
  generate: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: colors.softBlue,
    minHeight: 76,
    justifyContent: 'center',
  },
  generateText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  hint: { color: colors.neutralGray, fontSize: 13, marginTop: 10 },
  errorBox: { marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#FEF2F2', gap: 6 },
  errorText: { color: '#B91C1C', fontSize: 13 },
  retry: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  saved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  savedOpen: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  savedTitle: { fontSize: 14, fontWeight: '700', color: colors.darkBlue },
  savedMeta: { fontSize: 11, color: colors.neutralGray, marginTop: 2 },
  counter: { fontSize: 12, color: '#64748B', fontWeight: '600', marginBottom: 12 },
  card: {
    minHeight: 220,
    borderRadius: 18,
    padding: 22,
    backgroundColor: colors.softBlue,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  cardBack: { backgroundColor: colors.primary },
  cardSide: { fontSize: 11, fontWeight: '800', letterSpacing: 1, color: colors.primary },
  cardText: { fontSize: 19, fontWeight: '600', color: colors.darkBlue, textAlign: 'center', lineHeight: 27 },
  cardHint: { fontSize: 11, color: '#64748B' },
  row: { flexDirection: 'row', gap: 10, marginTop: 16 },
  primary: { flex: 1, backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  primaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  secondary: { flex: 1, backgroundColor: colors.softBlue, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  secondaryText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  disabled: { opacity: 0.4 },
  question: { fontSize: 17, fontWeight: '700', color: colors.darkBlue, lineHeight: 24, marginBottom: 14 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  optionRight: { borderColor: '#16A34A', backgroundColor: '#F0FDF4' },
  optionWrong: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  optionLetter: { fontWeight: '800', color: colors.primary, width: 18 },
  optionText: { flex: 1, color: colors.darkBlue, fontSize: 15, lineHeight: 21 },
  explanation: { marginTop: 6, padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC' },
  explanationTitle: { fontWeight: '800', color: colors.darkBlue, marginBottom: 4 },
  explanationText: { color: '#475569', lineHeight: 21 },
  resultBox: { alignItems: 'center', paddingTop: 30, gap: 6 },
  resultScore: { fontSize: 44, fontWeight: '800', color: colors.primary },
  resultPercent: { fontSize: 16, fontWeight: '700', color: colors.darkBlue },
  resultText: { color: '#475569', textAlign: 'center', marginBottom: 10 },
});
