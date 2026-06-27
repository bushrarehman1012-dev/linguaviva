export interface Language {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  speakerCount: number;
  status: 'vulnerable' | 'endangered' | 'critically_endangered';
  script: 'arabic' | 'nastaliq' | 'latin';
  isRTL: boolean;
  hasAITranslation: boolean;
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
    hasAITranslation: true,
    description:
      'Pashto is an Eastern Iranian language spoken primarily in Afghanistan and Pakistan. It is one of the two official languages of Afghanistan and a regional language in KPK province of Pakistan.',
    culturalNotes:
      'Pashtunwali, the traditional Pashtun code of ethics, deeply shapes language use. Hospitality (melmastia), honor (nang), and courage (tureh) are core values reflected in Pashto idioms and proverbs.',
  },
  {
    code: 'bsk',
    name: 'Burushaski',
    nativeName: 'بروشسکی',
    region: 'Hunza, Nagar, Yasin — Gilgit-Baltistan, Pakistan',
    speakerCount: 100000,
    status: 'endangered',
    script: 'nastaliq',
    isRTL: true,
    hasAITranslation: false,
    description:
      'Burushaski is a language isolate — it has no known relatives in any language family on Earth. It is spoken in the remote valleys of Hunza, Nagar, and Yasin in Gilgit-Baltistan, Pakistan.',
    culturalNotes:
      'The Burusho people have a rich oral tradition including epic poetry and folk tales centered on the legendary kingdom of Hunza. The language encodes a unique four-gender noun system not found in any neighboring language.',
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
    hasAITranslation: false,
    description:
      'Shina is a Dardic language of the Indo-Aryan branch spoken across Gilgit-Baltistan and parts of Kohistan. It is one of the most widely spoken languages in the mountainous north of Pakistan.',
    culturalNotes:
      'Shina has a rich tradition of folk poetry called "shairí" performed at communal gatherings. The language has absorbed vocabulary from neighboring Burushaski, Persian, and Urdu over centuries of contact.',
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
    hasAITranslation: false,
    description:
      'Hindko is an Indo-Aryan language spoken in the Hazara region and Peshawar Valley of KPK. It is the primary language of the Hindkowans and serves as a lingua franca across much of the region.',
    culturalNotes:
      "Hindko is famous for its rich poetic tradition. The city of Abbottabad and Hazara's folklore contain distinctive Hindko music (mahiya, tappe) that differs significantly from Punjabi or Pashto traditions.",
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
    hasAITranslation: false,
    description:
      'Indus Kohistani (also called Maiya) is a Dardic language spoken in the Kohistan district of KPK. It is critically endangered with diminishing speaker numbers and very limited documentation.',
    culturalNotes:
      'Kohistani culture centers on the Indus River valley. Traditional music using the sitar and rabab, along with oral histories of the region\'s isolated mountain communities, are encoded in this language.',
  },
];

export const getLanguage = (code: string): Language | undefined =>
  LANGUAGES.find((l) => l.code === code);