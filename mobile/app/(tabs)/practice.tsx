import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  SectionList,
} from 'react-native';
import { LANGUAGES } from '../../src/data/languageSeeds';
import { getPhrases, getDueFlashcards, updateFlashcardProgress } from '../../src/data/db';
import { getTextStyle } from '../../src/utils/rtl';

type Tab = 'phrases' | 'flashcards';

export default function PracticeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('phrases');
  const [selectedLang, setSelectedLang] = useState('ps');

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Practice</Text>

      {/* Language selector */}
      <FlatList
        data={LANGUAGES}
        horizontal
        keyExtractor={(item) => item.code}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, marginBottom: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.langPill, item.code === selectedLang && styles.langPillActive]}
            onPress={() => setSelectedLang(item.code)}
          >
            <Text style={[styles.langPillText, item.code === selectedLang && styles.langPillTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'phrases' && styles.tabActive]}
          onPress={() => setActiveTab('phrases')}
        >
          <Text style={[styles.tabText, activeTab === 'phrases' && styles.tabTextActive]}>Phrases</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'flashcards' && styles.tabActive]}
          onPress={() => setActiveTab('flashcards')}
        >
          <Text style={[styles.tabText, activeTab === 'flashcards' && styles.tabTextActive]}>Flashcards</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'phrases' ? (
        <PhraseLibrary langCode={selectedLang} />
      ) : (
        <FlashCards langCode={selectedLang} />
      )}
    </SafeAreaView>
  );
}

function PhraseLibrary({ langCode }: { langCode: string }) {
  const [sections, setSections] = useState<Array<{ title: string; data: Array<{ id: number; source_text: string; target_text: string; transliteration: string | null; cultural_note: string | null }> }>>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const textStyle = getTextStyle(langCode);

  useEffect(() => {
    getPhrases(langCode).then((rows) => {
      const grouped: Record<string, typeof rows> = {};
      for (const r of rows) {
        if (!grouped[r.category]) grouped[r.category] = [];
        grouped[r.category].push(r);
      }
      setSections(
        Object.entries(grouped).map(([title, data]) => ({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          data,
        }))
      );
    });
  }, [langCode]);

  if (sections.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No phrases yet for this language.</Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id.toString()}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.phraseRow}
          onPress={() => setExpanded(expanded === item.id ? null : item.id)}
          activeOpacity={0.7}
        >
          <Text style={styles.phraseSource}>{item.source_text}</Text>
          <Text style={[styles.phraseTarget, textStyle]}>{item.target_text}</Text>
          {item.transliteration && (
            <Text style={styles.transliteration}>{item.transliteration}</Text>
          )}
          {expanded === item.id && item.cultural_note && (
            <View style={styles.culturalNote}>
              <Text style={styles.culturalNoteText}>💡 {item.cultural_note}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
    />
  );
}

function FlashCards({ langCode }: { langCode: string }) {
  const [cards, setCards] = useState<Array<{ id: number; source_word: string; target_word: string; transliteration: string | null; box: number }>>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const textStyle = getTextStyle(langCode);

  useEffect(() => {
    getDueFlashcards(langCode).then((rows: typeof cards) => {
      setCards(rows);
      setIndex(0);
      setFlipped(false);
      setCorrect(0);
      setDone(false);
    });
  }, [langCode]);

  if (cards.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No cards due for review!</Text>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.empty}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneText}>Session complete!</Text>
        <Text style={styles.doneScore}>{correct}/{cards.length} correct</Text>
        <TouchableOpacity style={styles.restartBtn} onPress={() => { setIndex(0); setFlipped(false); setDone(false); setCorrect(0); }}>
          <Text style={styles.restartBtnText}>Restart</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const card = cards[index];

  const handleAnswer = async (easy: boolean) => {
    const currentBox = card.box ?? 1;
    const newBox = easy ? Math.min(currentBox + 1, 5) : 1;
    await updateFlashcardProgress(langCode, card.id, newBox);
    if (easy) setCorrect((c) => c + 1);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  };

  return (
    <View style={styles.flashContainer}>
      <Text style={styles.progressText}>{index + 1}/{cards.length}</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${((index) / cards.length) * 100}%` }]} />
      </View>

      <TouchableOpacity style={styles.flashCard} onPress={() => setFlipped(!flipped)} activeOpacity={0.8}>
        {!flipped ? (
          <>
            <Text style={styles.flashLabel}>English</Text>
            <Text style={styles.flashWord}>{card.source_word}</Text>
            <Text style={styles.flashHint}>Tap to reveal</Text>
          </>
        ) : (
          <>
            <Text style={styles.flashLabel}>{LANGUAGES.find((l) => l.code === langCode)?.name}</Text>
            <Text style={[styles.flashWord, textStyle]}>{card.target_word}</Text>
            {card.transliteration && (
              <Text style={styles.transliteration}>{card.transliteration}</Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {flipped && (
        <View style={styles.answerRow}>
          <TouchableOpacity style={[styles.answerBtn, styles.hardBtn]} onPress={() => handleAnswer(false)}>
            <Text style={styles.answerBtnText}>Hard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.answerBtn, styles.easyBtn]} onPress={() => handleAnswer(true)}>
            <Text style={styles.answerBtnText}>Easy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  heading: { fontSize: 26, fontWeight: '700', color: '#1A6B3C', margin: 16 },
  langPill: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#e8f5ee', marginRight: 8,
  },
  langPillActive: { backgroundColor: '#1A6B3C' },
  langPillText: { fontSize: 13, fontWeight: '600', color: '#1A6B3C' },
  langPillTextActive: { color: '#fff' },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#e5e7eb', borderRadius: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, color: '#888', fontWeight: '600' },
  tabTextActive: { color: '#1A6B3C' },
  sectionHeader: {
    fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase',
    letterSpacing: 1, paddingVertical: 8, backgroundColor: '#f5f7fa',
  },
  phraseRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee',
  },
  phraseSource: { fontSize: 14, color: '#555', marginBottom: 4 },
  phraseTarget: { fontSize: 17, fontWeight: '600', color: '#111' },
  transliteration: { fontSize: 12, color: '#888', marginTop: 2, fontStyle: 'italic' },
  culturalNote: { backgroundColor: '#fffbeb', borderRadius: 8, padding: 8, marginTop: 8 },
  culturalNoteText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#aaa', textAlign: 'center' },
  flashContainer: { flex: 1, paddingHorizontal: 16 },
  progressText: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 6 },
  progressBarBg: { height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginBottom: 20 },
  progressBarFill: { height: 4, backgroundColor: '#1A6B3C', borderRadius: 2 },
  flashCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center',
    justifyContent: 'center', minHeight: 200, shadowColor: '#000',
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  flashLabel: { fontSize: 12, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  flashWord: { fontSize: 28, fontWeight: '700', color: '#111', textAlign: 'center' },
  flashHint: { fontSize: 12, color: '#bbb', marginTop: 20 },
  answerRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 },
  answerBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  hardBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fca5a5' },
  easyBtn: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#86efac' },
  answerBtnText: { fontSize: 16, fontWeight: '700', color: '#333' },
  doneEmoji: { fontSize: 48, marginBottom: 12 },
  doneText: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 6 },
  doneScore: { fontSize: 16, color: '#1A6B3C', fontWeight: '600', marginBottom: 20 },
  restartBtn: { backgroundColor: '#1A6B3C', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  restartBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
