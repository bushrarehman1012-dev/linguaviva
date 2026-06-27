import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LANGUAGES, STATUS_COLORS, STATUS_LABELS, formatSpeakers } from '../data/languages';
import type { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList>;

export default function LanguagesScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');

  const filtered = query
    ? LANGUAGES.filter(
        (l) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.region.toLowerCase().includes(query.toLowerCase()),
      )
    : LANGUAGES;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Languages</Text>
        <TextInput
          style={styles.search}
          placeholder="Search languages..."
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={setQuery}
        />
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('LanguageDetail', { langCode: item.code })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.langName}>{item.name}</Text>
                  <Text style={styles.nativeName}>{item.nativeName}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                    {STATUS_LABELS[item.status]}
                  </Text>
                </View>
              </View>
              <Text style={styles.region}>{item.region}</Text>
              <Text style={styles.speakers}>{formatSpeakers(item.speakerCount)}</Text>
            </TouchableOpacity>
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
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 12 },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  langName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  nativeName: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  region: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  speakers: { fontSize: 13, color: '#9CA3AF' },
});
