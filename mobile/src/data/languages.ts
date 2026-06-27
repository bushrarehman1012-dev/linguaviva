export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  speakerCount: number;
  status: 'vulnerable' | 'endangered' | 'critically_endangered';
  script: 'arabic' | 'nastaliq' | 'latin';
  isRTL: boolean;
  description: string;
  culturalNotes: string;
}

export const LANGUAGES: Language[] = [
  {
    code: 'ps',
    name: 'Pashto',
    nativeName: 'پښتو',
    region: 'KPK, Pakistan & Afghanistan',
    speakerCount: 60000000,
    status: 'vulnerable',
    script: 'arabic',
    isRTL: true,
    description: 'Pashto is an Eastern Iranian language spoken primarily in Afghanistan and Pakistan.',
    culturalNotes: 'Pashtunwali, the traditional Pashtun code of ethics, deeply shapes language use.',
  },
  {
    code: 'bsk',
    name: 'Burushaski',
    nativeName: 'بروشسکی',
    region: 'Hunza, Nagar, Yasin — Gilgit-Baltistan',
    speakerCount: 100000,
    status: 'endangered',
    script: 'nastaliq',
    isRTL: true,
    description: 'Burushaski is a language isolate — it has no known relatives in any language family on Earth.',
    culturalNotes: 'The Burusho people have a rich oral tradition including epic poetry and folk tales.',
  },
  {
    code: 'scl',
    name: 'Shina',
    nativeName: 'شینا',
    region: 'Gilgit-Baltistan & Kohistan, Pakistan',
    speakerCount: 800000,
    status: 'vulnerable',
    script: 'nastaliq',
    isRTL: true,
    description: 'Shina is a Dardic language of the Indo-Aryan branch spoken across Gilgit-Baltistan.',
    culturalNotes: 'Shina has a rich tradition of folk poetry called shairí.',
  },
  {
    code: 'hno',
    name: 'Hindko',
    nativeName: 'ہندکو',
    region: 'Hazara, Peshawar Valley — KPK, Pakistan',
    speakerCount: 5000000,
    status: 'vulnerable',
    script: 'nastaliq',
    isRTL: true,
    description: 'Hindko is an Indo-Aryan language spoken in the Hazara region and Peshawar Valley.',
    culturalNotes: 'Hindko is famous for its rich poetic tradition including mahiya and tappe.',
  },
  {
    code: 'mvy',
    name: 'Kohistani',
    nativeName: 'کوہستانی',
    region: 'Kohistan — KPK, Pakistan',
    speakerCount: 200000,
    status: 'critically_endangered',
    script: 'nastaliq',
    isRTL: true,
    description: 'Indus Kohistani is a critically endangered Dardic language spoken in Kohistan district.',
    culturalNotes: "Traditional music using the sitar and rabab are encoded in this language's oral tradition.",
  },
];

export const STATUS_COLORS: Record<Language['status'], string> = {
  vulnerable: '#F59E0B',
  endangered: '#EF4444',
  critically_endangered: '#7C3AED',
};

export const STATUS_LABELS: Record<Language['status'], string> = {
  vulnerable: 'Vulnerable',
  endangered: 'Endangered',
  critically_endangered: 'Critically Endangered',
};

export function formatSpeakers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M speakers`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K speakers`;
  return `${count} speakers`;
}
