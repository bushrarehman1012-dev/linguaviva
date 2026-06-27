import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { getLanguage, Language } from '../../src/data/languageSeeds';
import { useAppStore } from '../../src/store/useAppStore';

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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export default function LanguageDetailScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const { setTargetLang, setSourceLang } = useAppStore();
  const lang = getLanguage(code);

  if (!lang) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Language not found.</Text>
      </SafeAreaView>
    );
  }

  const handleTranslate = () => {
    setSourceLang('en');
    setTargetLang(lang.code);
    router.replace('/(tabs)/translate');
  };

  const handlePractice = () => {
    router.replace('/(tabs)/practice');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.langName}>{lang.name}</Text>
          <Text style={styles.nativeName}>{lang.nativeName}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[lang.status] }]}>
            <Text style={styles.statusText}>{STATUS_LABELS[lang.status]}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatSpeakers(lang.speakerCount)}</Text>
            <Text style={styles.statLabel}>Speakers</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lang.script}</Text>
            <Text style={styles.statLabel}>Script</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{lang.isRTL ? 'RTL' : 'LTR'}</Text>
            <Text style={styles.statLabel}>Direction</Text>
          </View>
        </View>

        {/* Region */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Region</Text>
          <Text style={styles.sectionBody}>📍 {lang.region}</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this Language</Text>
          <Text style={styles.sectionBody}>{lang.description}</Text>
        </View>

        {/* Cultural notes */}
        <View style={[styles.section, styles.culturalSection]}>
          <Text style={styles.sectionTitle}>Cultural Notes</Text>
          <Text style={styles.sectionBody}>{lang.culturalNotes}</Text>
        </View>

        {/* AI translation badge */}
        {!lang.hasAITranslation && (
          <View style={styles.noAIBanner}>
            <Text style={styles.noAIText}>
              ⚠️ AI translation is not available for {lang.name}. Translations come from our curated dictionary. You can help expand it!
            </Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleTranslate}>
            <Text style={styles.primaryBtnText}>🔤 Translate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handlePractice}>
            <Text style={styles.secondaryBtnText}>📚 Practice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  error: { fontSize: 16, color: '#888', margin: 32, textAlign: 'center' },
  hero: { backgroundColor: '#1A6B3C', padding: 24, alignItems: 'center' },
  langName: { fontSize: 30, fontWeight: '800', color: '#fff' },
  nativeName: { fontSize: 18, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 12 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', margin: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statValue: { fontSize: 14, fontWeight: '700', color: '#1A6B3C', textAlign: 'center', textTransform: 'capitalize' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 3 },
  section: {
    backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  culturalSection: { backgroundColor: '#fffbeb' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  sectionBody: { fontSize: 15, color: '#333', lineHeight: 22 },
  noAIBanner: {
    backgroundColor: '#fef3c7', marginHorizontal: 16, marginBottom: 10,
    borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#fcd34d',
  },
  noAIText: { fontSize: 13, color: '#92400e', lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginVertical: 16 },
  primaryBtn: {
    flex: 1, backgroundColor: '#1A6B3C', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#1A6B3C',
  },
  secondaryBtnText: { color: '#1A6B3C', fontSize: 15, fontWeight: '700' },
});
