import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LANGUAGES, STATUS_COLORS, formatSpeakers } from '../data/languages';
import type { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList>;

export default function PracticeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Practice</Text>
        <Text style={styles.subtitle}>Choose a language to start learning</Text>

        <FlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.langName}>{item.name}</Text>
                <Text style={styles.nativeName}>{item.nativeName}</Text>
                <Text style={styles.speakers}>{formatSpeakers(item.speakerCount)}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actBtn}
                  onPress={() => navigation.navigate('Phrases', { langCode: item.code })}
                >
                  <Text style={styles.actBtnIcon}>💬</Text>
                  <Text style={styles.actBtnText}>Phrases</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actBtn, styles.actBtnPrimary]}
                  onPress={() => navigation.navigate('Flashcard', { langCode: item.code })}
                >
                  <Text style={styles.actBtnIcon}>🃏</Text>
                  <Text style={[styles.actBtnText, { color: '#fff' }]}>Flashcards</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] }]} />
            </View>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'relative',
    overflow: 'hidden',
  },
  cardInfo: { marginBottom: 12 },
  langName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  nativeName: { fontSize: 14, color: '#6B7280', marginTop: 2, marginBottom: 4 },
  speakers: { fontSize: 12, color: '#9CA3AF' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  actBtnPrimary: { backgroundColor: '#4F46E5' },
  actBtnIcon: { fontSize: 16 },
  actBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  statusDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
