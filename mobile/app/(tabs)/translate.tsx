import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useAppStore } from '../../src/store/useAppStore';
import { translate } from '../../src/api/translate';
import { getTextStyle } from '../../src/utils/rtl';
import { LANGUAGES } from '../../src/data/languageSeeds';

const ALL_LANGS = [{ code: 'en', name: 'English', nativeName: 'English' }, ...LANGUAGES];

export default function TranslateScreen() {
  const { sourceLang, targetLang, setSourceLang, setTargetLang, swapLanguages, translationHistory, addToHistory } =
    useAppStore();
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState('');
  const [resultSource, setResultSource] = useState<'ai' | 'ai_cached' | 'dictionary' | 'none' | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sourceLangObj = ALL_LANGS.find((l) => l.code === sourceLang);
  const targetLangObj = ALL_LANGS.find((l) => l.code === targetLang);

  const runTranslation = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setResult('');
        setResultSource(null);
        return;
      }
      setLoading(true);
      try {
        const res = await translate(text, sourceLang, targetLang);
        setResult(res.translation);
        setResultSource(res.source);
        if (res.translation) {
          addToHistory({
            sourceLang,
            targetLang,
            sourceText: text,
            translation: res.translation,
            source: res.source,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [sourceLang, targetLang, addToHistory]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runTranslation(inputText);
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [inputText, runTranslation]);

  const sourceStyle = getTextStyle(sourceLang);
  const targetStyle = getTextStyle(targetLang);

  const sourceChip = (
    <TouchableOpacity style={styles.langChip} onPress={() => setShowSourcePicker(!showSourcePicker)}>
      <Text style={styles.langChipText}>{sourceLangObj?.name ?? sourceLang}</Text>
      <Text style={styles.chevron}>▼</Text>
    </TouchableOpacity>
  );

  const targetChip = (
    <TouchableOpacity style={styles.langChip} onPress={() => setShowTargetPicker(!showTargetPicker)}>
      <Text style={styles.langChipText}>{targetLangObj?.name ?? targetLang}</Text>
      <Text style={styles.chevron}>▼</Text>
    </TouchableOpacity>
  );

  const sourcePickerMenu = showSourcePicker && (
    <View style={styles.pickerMenu}>
      {ALL_LANGS.map((l) => (
        <TouchableOpacity
          key={l.code}
          style={[styles.pickerItem, l.code === sourceLang && styles.pickerItemSelected]}
          onPress={() => {
            if (l.code !== targetLang) setSourceLang(l.code);
            setShowSourcePicker(false);
          }}
        >
          <Text style={styles.pickerItemText}>{l.name}</Text>
          <Text style={styles.pickerItemNative}>{l.nativeName}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const targetPickerMenu = showTargetPicker && (
    <View style={[styles.pickerMenu, { right: 0 }]}>
      {LANGUAGES.map((l) => (
        <TouchableOpacity
          key={l.code}
          style={[styles.pickerItem, l.code === targetLang && styles.pickerItemSelected]}
          onPress={() => {
            if (l.code !== sourceLang) setTargetLang(l.code);
            setShowTargetPicker(false);
          }}
        >
          <Text style={styles.pickerItemText}>{l.name}</Text>
          <Text style={styles.pickerItemNative}>{l.nativeName}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const sourceBadge: Record<string, { label: string; color: string }> = {
    ai: { label: 'via AI', color: '#1A6B3C' },
    ai_cached: { label: 'via AI', color: '#1A6B3C' },
    dictionary: { label: 'Dictionary', color: '#2563eb' },
    none: { label: 'Not found', color: '#dc2626' },
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Translate</Text>

        {/* Language pair row */}
        <View style={styles.langRow}>
          <View style={{ flex: 1, position: 'relative' }}>
            {sourceChip}
            {sourcePickerMenu}
          </View>
          <TouchableOpacity style={styles.swapBtn} onPress={() => { swapLanguages(); setResult(''); }}>
            <Text style={styles.swapText}>⇄</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, position: 'relative' }}>
            {targetChip}
            {targetPickerMenu}
          </View>
        </View>

        {/* Input */}
        <View style={styles.card}>
          <TextInput
            style={[styles.input, sourceStyle]}
            multiline
            maxLength={500}
            placeholder="Type text to translate…"
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
          />
          <Text style={styles.charCount}>{inputText.length}/500</Text>
        </View>

        {/* Result */}
        <View style={[styles.card, styles.resultCard]}>
          {loading ? (
            <ActivityIndicator color="#1A6B3C" />
          ) : result ? (
            <>
              <Text style={[styles.resultText, targetStyle]}>{result}</Text>
              {resultSource && sourceBadge[resultSource] && (
                <View style={[styles.sourceBadge, { backgroundColor: sourceBadge[resultSource].color }]}>
                  <Text style={styles.sourceBadgeText}>{sourceBadge[resultSource].label}</Text>
                </View>
              )}
            </>
          ) : inputText ? (
            <Text style={styles.noResult}>No translation found. Try the phrase library or contribute.</Text>
          ) : (
            <Text style={styles.placeholder}>Translation appears here</Text>
          )}
        </View>

        {/* History */}
        {translationHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Recent</Text>
            {translationHistory.slice(0, 5).map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.historyItem}
                onPress={() => setInputText(entry.sourceText)}
              >
                <Text style={styles.historySource} numberOfLines={1}>{entry.sourceText}</Text>
                <Text style={[styles.historyTarget, getTextStyle(entry.targetLang)]} numberOfLines={1}>
                  {entry.translation}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  heading: { fontSize: 26, fontWeight: '700', color: '#1A6B3C', margin: 16 },
  langRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12 },
  langChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#ddd',
  },
  langChipText: { fontSize: 14, fontWeight: '600', color: '#222' },
  chevron: { fontSize: 10, color: '#888', marginLeft: 6 },
  swapBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A6B3C',
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 8,
  },
  swapText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  pickerMenu: {
    position: 'absolute', top: 44, left: 0, right: 0,
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd',
    zIndex: 100, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 5,
  },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  pickerItemSelected: { backgroundColor: '#e8f5ee' },
  pickerItemText: { fontSize: 14, fontWeight: '600', color: '#222' },
  pickerItemNative: { fontSize: 12, color: '#888', marginTop: 1 },
  card: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  resultCard: { minHeight: 80, justifyContent: 'center' },
  input: { fontSize: 16, color: '#222', minHeight: 90, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#bbb', textAlign: 'right', marginTop: 4 },
  resultText: { fontSize: 20, color: '#111', lineHeight: 30 },
  sourceBadge: {
    alignSelf: 'flex-start', borderRadius: 10, paddingHorizontal: 8,
    paddingVertical: 2, marginTop: 8,
  },
  sourceBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  noResult: { color: '#888', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
  placeholder: { color: '#ccc', fontSize: 16, textAlign: 'center' },
  historySection: { marginHorizontal: 16, marginTop: 4 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  historyItem: {
    backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#eee',
  },
  historySource: { fontSize: 13, color: '#555' },
  historyTarget: { fontSize: 13, color: '#1A6B3C', fontWeight: '600', marginTop: 2 },
});
