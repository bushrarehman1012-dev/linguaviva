import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LANGUAGES, STATUS_COLORS, STATUS_LABELS, formatSpeakers } from '../data/languages';
import { useAppStore } from '../store/useAppStore';
import type { RootStackParamList } from '../../App';

type Route = RouteProp<RootStackParamList, 'LanguageDetail'>;
type Nav = StackNavigationProp<RootStackParamList>;

export default function LanguageDetailScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { setTargetLang } = useAppStore();

  const lang = LANGUAGES.find((l) => l.code === route.params.langCode);
  if (!lang) return null;

  const statusColor = STATUS_COLORS[lang.status];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroName}>{lang.name}</Text>
          <Text style={styles.heroNative}>{lang.nativeName}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '22' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>
              {STATUS_LABELS[lang.status]}
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatSpeakers(lang.speakerCount)}</Text>
            <Text style={styles.statLabel}>Speakers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lang.region.split('—')[0].trim()}</Text>
            <Text style={styles.statLabel}>Region</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lang.isRTL ? 'RTL' : 'LTR'}</Text>
            <Text style={styles.statLabel}>Script</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bodyText}>{lang.description}</Text>
        </View>

        {/* Cultural Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cultural Notes</Text>
          <Text style={styles.bodyText}>{lang.culturalNotes}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => {
              setTargetLang(lang.code);
              navigation.navigate('Main' as any);
            }}
          >
            <Text style={styles.actionBtnPrimaryText}>Translate →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Phrases', { langCode: lang.code })}
          >
            <Text style={styles.actionBtnText}>Browse Phrases</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Flashcard', { langCode: lang.code })}
          >
            <Text style={styles.actionBtnText}>Practice Words</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  container: { flex: 1, padding: 16 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 16, color: '#4F46E5', fontWeight: '600' },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroName: { fontSize: 36, fontWeight: '800', color: '#111827' },
  heroNative: { fontSize: 24, color: '#6B7280', marginTop: 4, marginBottom: 12 },
  statusPill: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  statusPillText: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111827', textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  bodyText: { fontSize: 15, color: '#374151', lineHeight: 24 },
  actions: { gap: 10, marginBottom: 32 },
  actionBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionBtnPrimary: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  actionBtnPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  actionBtnText: { fontSize: 16, fontWeight: '600', color: '#374151' },
});
