import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { translate } from '../api/translate';
import { useAppStore } from '../store/useAppStore';
import { LANGUAGES } from '../data/languages';

const ALL_LANGS = [{ code: 'en', name: 'English', isRTL: false }, ...LANGUAGES];

export default function TranslateScreen() {
  const { sourceLang, targetLang, setSourceLang, setTargetLang, swapLanguages, translationHistory, addToHistory } =
    useAppStore();

  const [inputText, setInputText] = useState('');
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [sourceLabel, setSourceLabel] = useState<'ai' | 'ai_cached' | 'none' | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sourceLangObj = ALL_LANGS.find((l) => l.code === sourceLang);
  const targetLangObj = ALL_LANGS.find((l) => l.code === targetLang);
  const targetIsRTL = targetLangObj && 'isRTL' in targetLangObj ? (targetLangObj as any).isRTL : false;

  const doTranslate = useCallback(
    async (text: string) => {
      if (!text.trim()) {
        setTranslation('');
        setSourceLabel(null);
        return;
      }
      setLoading(true);
      try {
        const result = await translate(text, sourceLang, targetLang);
        setTranslation(result.translation);
        setSourceLabel(result.source);
        if (result.translation) {
          addToHistory({
            sourceLang,
            targetLang,
            sourceText: text,
            translation: result.translation,
            source: result.source,
          });
        }
      } catch (err: any) {
        Alert.alert('Error', err?.response?.data?.error || 'Translation failed. Is the server running?');
      } finally {
        setLoading(false);
      }
    },
    [sourceLang, targetLang, addToHistory],
  );

  const handleTextChange = (text: string) => {
    setInputText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => doTranslate(text), 600);
  };

  const handleSwap = () => {
    swapLanguages();
    setInputText(translation);
    setTranslation(inputText);
    setSourceLabel(null);
  };

  const sourceBadge =
    sourceLabel === 'ai' || sourceLabel === 'ai_cached' ? 'via AI' : sourceLabel === 'none' ? 'No result' : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Translate</Text>

          {/* Language Pair Row */}
          <View style={styles.pairRow}>
            <TouchableOpacity style={styles.langButton} onPress={() => setShowSourcePicker((v) => !v)}>
              <Text style={styles.langButtonText}>{sourceLangObj?.name ?? sourceLang}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.swapButton} onPress={handleSwap}>
              <Text style={styles.swapIcon}>⇄</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.langButton} onPress={() => setShowTargetPicker((v) => !v)}>
              <Text style={styles.langButtonText}>{targetLangObj?.name ?? targetLang}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Source Picker */}
          {showSourcePicker && (
            <View style={styles.picker}>
              {ALL_LANGS.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.pickerItem, sourceLang === l.code && styles.pickerItemActive]}
                  onPress={() => {
                    setSourceLang(l.code);
                    setShowSourcePicker(false);
                    setTranslation('');
                    setSourceLabel(null);
                  }}
                >
                  <Text style={[styles.pickerText, sourceLang === l.code && styles.pickerTextActive]}>
                    {l.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Target Picker */}
          {showTargetPicker && (
            <View style={styles.picker}>
              {ALL_LANGS.map((l) => (
                <TouchableOpacity
                  key={l.code}
                  style={[styles.pickerItem, targetLang === l.code && styles.pickerItemActive]}
                  onPress={() => {
                    setTargetLang(l.code);
                    setShowTargetPicker(false);
                    setTranslation('');
                    setSourceLabel(null);
                  }}
                >
                  <Text style={[styles.pickerText, targetLang === l.code && styles.pickerTextActive]}>
                    {l.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Source Input */}
          <View style={styles.inputCard}>
            <TextInput
              style={styles.textInput}
              placeholder="Type something to translate..."
              placeholderTextColor="#9CA3AF"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
            {inputText.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setInputText('');
                  setTranslation('');
                  setSourceLabel(null);
                }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>✕</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.charCount}>{inputText.length}/500</Text>
          </View>

          {/* Translation Output */}
          <View style={styles.outputCard}>
            {loading ? (
              <ActivityIndicator color="#4F46E5" size="small" style={{ paddingVertical: 16 }} />
            ) : translation ? (
              <>
                <Text
                  style={[
                    styles.translationText,
                    targetIsRTL && { textAlign: 'right', writingDirection: 'rtl' },
                  ]}
                  selectable
                >
                  {translation}
                </Text>
                {sourceBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{sourceBadge}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.placeholderOutput}>Translation will appear here</Text>
            )}
          </View>

          {/* History */}
          {translationHistory.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent</Text>
              {translationHistory.slice(0, 5).map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.historyItem}
                  onPress={() => {
                    setInputText(entry.sourceText);
                    setTranslation(entry.translation);
                    setSourceLabel(entry.source as any);
                  }}
                >
                  <Text style={styles.historySource} numberOfLines={1}>
                    {entry.sourceText}
                  </Text>
                  <Text style={styles.historyTarget} numberOfLines={1}>
                    {entry.translation}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 16 },
  pairRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  langButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  langButtonText: { fontSize: 15, fontWeight: '600', color: '#111827' },
  chevron: { fontSize: 10, color: '#9CA3AF' },
  swapButton: {
    width: 40,
    height: 40,
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: { fontSize: 18, color: '#fff' },
  picker: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    overflow: 'hidden',
  },
  pickerItem: { paddingHorizontal: 16, paddingVertical: 14 },
  pickerItemActive: { backgroundColor: '#EEF2FF' },
  pickerText: { fontSize: 15, color: '#374151' },
  pickerTextActive: { color: '#4F46E5', fontWeight: '600' },
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  textInput: {
    fontSize: 17,
    color: '#111827',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clearBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  clearBtnText: { fontSize: 14, color: '#9CA3AF' },
  charCount: { fontSize: 12, color: '#D1D5DB', textAlign: 'right', marginTop: 4 },
  outputCard: {
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    marginBottom: 24,
    justifyContent: 'center',
  },
  translationText: { fontSize: 20, color: '#1E1B4B', fontWeight: '500', lineHeight: 30 },
  placeholderOutput: { fontSize: 15, color: '#A5B4FC', fontStyle: 'italic' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#C7D2FE',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 8,
  },
  badgeText: { fontSize: 11, color: '#4F46E5', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 },
  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  historySource: { fontSize: 14, color: '#6B7280', marginBottom: 2 },
  historyTarget: { fontSize: 15, color: '#111827', fontWeight: '500' },
});
