import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LANGUAGES, Language } from '../../src/data/languageSeeds';

const STATUS_COLORS: Record<Language['status'], string> = {
  vulnerable: '#d97706',
  endangered: '#dc2626',
  critically_endangered: '#7c2d12',
};

const STATUS_LABELS: Record<Language['status'], string> = {
  vulnerable: 'Vulnerable',
  endangered: 'Endangered',
  critically_endangered: 'Critically Endangered',
};

function formatSpeakers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M speakers`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K speakers`;
  return `${n} speakers`;
}

function LanguageCard({ lang, onPress }: { lang: Language; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.langName}>{lang.name}</Text>
          <Text style={styles.nativeName}>{lang.nativeName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[lang.status] }]}>
          <Text style={styles.statusText}>{STATUS_LABELS[lang.status]}</Text>
        </View>
      </View>
      <Text style={styles.region}>📍 {lang.region}</Text>
      <Text style={styles.speakers}>{formatSpeakers(lang.speakerCount)}</Text>
      <Text style={styles.preview} numberOfLines={2}>{lang.description}</Text>
    </TouchableOpacity>
  );
}

export default function LanguagesScreen() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const filtered = LANGUAGES.filter(
    (l) =>
      l.name.toLowerCase().includes(query.toLowerCase()) ||
      l.region.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Languages</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by name or region…"
        placeholderTextColor="#aaa"
        value={query}
        onChangeText={setQuery}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <LanguageCard
            lang={item}
            onPress={() => router.push(`/language/${item.code}`)}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  heading: { fontSize: 26, fontWeight: '700', color: '#1A6B3C', margin: 16 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ddd',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  langName: { fontSize: 20, fontWeight: '700', color: '#111' },
  nativeName: { fontSize: 15, color: '#555', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8, marginTop: 2 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  region: { fontSize: 13, color: '#666', marginBottom: 4 },
  speakers: { fontSize: 13, fontWeight: '600', color: '#1A6B3C', marginBottom: 8 },
  preview: { fontSize: 13, color: '#777', lineHeight: 19 },
});
