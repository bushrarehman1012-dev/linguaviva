import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { getPhrases, type Phrase } from '../api/translate';
import { LANGUAGES } from '../data/languages';
import type { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'Phrases'>;
type Nav = StackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { key: 'greetings', label: 'Greetings' },
  { key: 'travel', label: 'Travel' },
  { key: 'food', label: 'Food' },
  { key: 'emergency', label: 'Emergency' },
  { key: 'numbers', label: 'Numbers' },
  { key: 'family', label: 'Family' },
];

export default function PhrasesScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { langCode } = route.params;

  const lang = LANGUAGES.find((l) => l.code === langCode);
  const [activeCategory, setActiveCategory] = useState('greetings');
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadPhrases(activeCategory);
  }, [activeCategory, langCode]);

  async function loadPhrases(category: string) {
    setLoading(true);
    setPhrases([]);
    setExpandedIndex(null);
    try {
      const result = await getPhrases(langCode, category);
      setPhrases(result);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Could not load phrases. Is the server running?');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{lang?.name} Phrases</Text>
        <Text style={styles.subtitle}>{lang?.nativeName}</Text>
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.tab, activeCategory === cat.key && styles.tabActive]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text style={[styles.tabText, activeCategory === cat.key && styles.tabTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 32 }}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Generating phrases with AI...</Text>
          </View>
        ) : (
          phrases.map((phrase, index) => (
            <TouchableOpacity
              key={index}
              style={styles.phraseCard}
              onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
              activeOpacity={0.8}
            >
              <Text style={styles.englishText}>{phrase.english}</Text>
              <Text
                style={[styles.translationText, lang?.isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}
              >
                {phrase.translation}
              </Text>
              {phrase.transliteration && (
                <Text style={styles.transliterationText}>{phrase.transliteration}</Text>
              )}
              {expandedIndex === index && phrase.note ? (
                <View style={styles.noteBox}>
                  <Text style={styles.noteText}>💡 {phrase.note}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 16, color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 2 },
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
  list: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  loadingContainer: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  phraseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  englishText: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  translationText: { fontSize: 20, color: '#111827', fontWeight: '600', marginBottom: 4 },
  transliterationText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
  noteBox: { marginTop: 8, backgroundColor: '#FFFBEB', borderRadius: 8, padding: 10 },
  noteText: { fontSize: 13, color: '#92400E' },
});
