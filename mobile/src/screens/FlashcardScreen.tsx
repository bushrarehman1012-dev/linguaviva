import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getVocabulary, type VocabWord } from '../api/translate';
import { LANGUAGES } from '../data/languages';
import type { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'Flashcard'>;
type Nav = StackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { key: 'everyday', label: 'Everyday' },
  { key: 'animals', label: 'Animals' },
  { key: 'food', label: 'Food' },
  { key: 'nature', label: 'Nature' },
  { key: 'body', label: 'Body' },
  { key: 'colors', label: 'Colors' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'family', label: 'Family' },
];

export default function FlashcardScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { langCode } = route.params;

  const lang = LANGUAGES.find((l) => l.code === langCode);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('everyday');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [scores, setScores] = useState<Record<number, 'easy' | 'hard'>>({});
  const [sessionDone, setSessionDone] = useState(false);

  useEffect(() => {
    loadWords(category);
  }, [category, langCode]);

  async function loadWords(cat: string) {
    setLoading(true);
    setWords([]);
    setCardIndex(0);
    setFlipped(false);
    setScores({});
    setSessionDone(false);
    try {
      const result = await getVocabulary(langCode, cat);
      setWords(result);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not load vocabulary.');
    } finally {
      setLoading(false);
    }
  }

  function handleScore(score: 'easy' | 'hard') {
    const newScores = { ...scores, [cardIndex]: score };
    setScores(newScores);

    if (cardIndex + 1 >= words.length) {
      setSessionDone(true);
    } else {
      setCardIndex(cardIndex + 1);
      setFlipped(false);
    }
  }

  function restartSession() {
    setCardIndex(0);
    setFlipped(false);
    setScores({});
    setSessionDone(false);
  }

  const currentWord = words[cardIndex];
  const easyCount = Object.values(scores).filter((s) => s === 'easy').length;
  const hardCount = Object.values(scores).filter((s) => s === 'hard').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{lang?.name} Vocabulary</Text>
      </View>

      {/* Category Picker */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.tab, category === cat.key && styles.tabActive]}
            onPress={() => setCategory(cat.key)}
          >
            <Text style={[styles.tabText, category === cat.key && styles.tabTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Generating vocabulary with AI...</Text>
          </View>
        ) : words.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No words loaded.</Text>
          </View>
        ) : sessionDone ? (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Session Complete!</Text>
            <Text style={styles.summarySubtitle}>{words.length} words reviewed</Text>
            <View style={styles.scoreRow}>
              <View style={[styles.scoreBox, { backgroundColor: '#D1FAE5' }]}>
                <Text style={styles.scoreNumber}>{easyCount}</Text>
                <Text style={styles.scoreLabel}>Easy</Text>
              </View>
              <View style={[styles.scoreBox, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.scoreNumber}>{hardCount}</Text>
                <Text style={styles.scoreLabel}>Hard</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.restartBtn} onPress={restartSession}>
              <Text style={styles.restartBtnText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.newCategoryBtn} onPress={() => setCategory('everyday')}>
              <Text style={styles.newCategoryBtnText}>New Category</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Progress */}
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                {cardIndex + 1} / {words.length}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${((cardIndex + 1) / words.length) * 100}%` }]}
                />
              </View>
            </View>

            {/* Card */}
            <TouchableOpacity style={styles.card} onPress={() => setFlipped(!flipped)} activeOpacity={0.9}>
              {!flipped ? (
                <View style={styles.cardFront}>
                  <Text style={styles.cardHint}>Tap to reveal</Text>
                  <Text style={styles.cardEnglish}>{currentWord.english}</Text>
                  {currentWord.partOfSpeech && (
                    <Text style={styles.cardPos}>{currentWord.partOfSpeech}</Text>
                  )}
                </View>
              ) : (
                <View style={styles.cardBack}>
                  <Text
                    style={[
                      styles.cardTranslation,
                      lang?.isRTL && { textAlign: 'right', writingDirection: 'rtl' },
                    ]}
                  >
                    {currentWord.translation}
                  </Text>
                  {currentWord.transliteration && (
                    <Text style={styles.cardTranslit}>{currentWord.transliteration}</Text>
                  )}
                  <Text style={styles.cardEnglishSmall}>{currentWord.english}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Score Buttons */}
            {flipped && (
              <View style={styles.scoreButtons}>
                <TouchableOpacity style={styles.hardBtn} onPress={() => handleScore('hard')}>
                  <Text style={styles.hardBtnText}>Hard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.easyBtn} onPress={() => handleScore('easy')}>
                  <Text style={styles.easyBtnText}>Easy</Text>
                </TouchableOpacity>
              </View>
            )}

            {!flipped && (
              <Text style={styles.flipHint}>Tap the card to see the {lang?.name} word</Text>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 16, color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  tabs: { paddingHorizontal: 16, marginBottom: 8, flexGrow: 0 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  tabText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  body: { flex: 1, padding: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
  progressRow: { marginBottom: 16 },
  progressText: { fontSize: 13, color: '#9CA3AF', marginBottom: 6 },
  progressBar: { height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: '#4F46E5', borderRadius: 2 },
  card: {
    flex: 1,
    maxHeight: 280,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 24,
  },
  cardFront: { alignItems: 'center' },
  cardBack: { alignItems: 'center' },
  cardHint: { fontSize: 12, color: '#D1D5DB', marginBottom: 16 },
  cardEnglish: { fontSize: 32, fontWeight: '700', color: '#111827', textAlign: 'center' },
  cardPos: { fontSize: 13, color: '#9CA3AF', marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 },
  cardTranslation: { fontSize: 36, fontWeight: '700', color: '#4F46E5', textAlign: 'center', marginBottom: 8 },
  cardTranslit: { fontSize: 16, color: '#9CA3AF', fontStyle: 'italic', marginBottom: 12 },
  cardEnglishSmall: { fontSize: 18, color: '#6B7280' },
  scoreButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  hardBtn: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  hardBtnText: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  easyBtn: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  easyBtnText: { fontSize: 16, fontWeight: '700', color: '#059669' },
  flipHint: { textAlign: 'center', fontSize: 13, color: '#D1D5DB' },
  summary: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 4 },
  summarySubtitle: { fontSize: 16, color: '#6B7280', marginBottom: 32 },
  scoreRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  scoreBox: { borderRadius: 16, padding: 24, alignItems: 'center', minWidth: 100 },
  scoreNumber: { fontSize: 40, fontWeight: '800', color: '#111827' },
  scoreLabel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  restartBtn: { backgroundColor: '#4F46E5', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginBottom: 10 },
  restartBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  newCategoryBtn: { borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  newCategoryBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
});
