const LANGUAGES = [
  {
    code: 'ps', name: 'Pashto', nativeName: 'پښتو',
    region: 'KPK, Pakistan & Afghanistan', speakerCount: 60000000,
    status: 'vulnerable', script: 'nastaliq', isRTL: true,
    description: 'Pashto is an Eastern Iranian language spoken across KPK and Afghanistan. It is the most widely-spoken regional language in the area.',
    culturalNotes: 'Pashtunwali, the traditional code of ethics, deeply shapes language and social interaction.',
  },
  {
    code: 'bsk', name: 'Burushaski', nativeName: 'بروشسکی',
    region: 'Hunza, Nagar, Yasin — Gilgit-Baltistan', speakerCount: 100000,
    status: 'endangered', script: 'nastaliq', isRTL: true,
    description: 'Burushaski is a language isolate — it has no known relatives in any language family on Earth, making it one of the most linguistically unique languages alive.',
    culturalNotes: 'The Burusho people of Hunza are known for their hospitality and rich oral epic tradition.',
  },
  {
    code: 'scl', name: 'Shina', nativeName: 'شینا',
    region: 'Gilgit-Baltistan & Kohistan', speakerCount: 800000,
    status: 'vulnerable', script: 'nastaliq', isRTL: true,
    description: 'Shina is a Dardic Indo-Aryan language spoken across Gilgit-Baltistan and parts of Kohistan.',
    culturalNotes: 'Shina has a rich tradition of folk poetry called shairí, sung at weddings and festivals.',
  },
  {
    code: 'hno', name: 'Hindko', nativeName: 'ہندکو',
    region: 'Hazara, Peshawar Valley — KPK', speakerCount: 5000000,
    status: 'vulnerable', script: 'nastaliq', isRTL: true,
    description: 'Hindko is an Indo-Aryan language spoken in Hazara and the Peshawar Valley, closely related to Punjabi.',
    culturalNotes: 'Hindko is famous for its mahiya and tappe poetic forms sung in mountain communities.',
  },
  {
    code: 'mvy', name: 'Kohistani', nativeName: 'کوہستانی',
    region: 'Kohistan — KPK', speakerCount: 200000,
    status: 'critically_endangered', script: 'nastaliq', isRTL: true,
    description: 'Indus Kohistani is a critically endangered Dardic language of Kohistan district, with limited written tradition.',
    culturalNotes: 'Traditional music using the sitar and rabab is central to this language\'s oral heritage.',
  },
  {
    code: 'khw', name: 'Khowar', nativeName: 'کھوار',
    region: 'Chitral — KPK', speakerCount: 240000,
    status: 'vulnerable', script: 'nastaliq', isRTL: true,
    description: 'Khowar (also called Chitrali) is the primary language of Chitral district. It belongs to the Dardic branch of Indo-Aryan.',
    culturalNotes: 'Khowar speakers are known for their polyphonic singing traditions unique to the Chitral valley.',
  },
  {
    code: 'bft', name: 'Balti', nativeName: 'بلتی',
    region: 'Baltistan — Gilgit-Baltistan', speakerCount: 400000,
    status: 'vulnerable', script: 'nastaliq', isRTL: true,
    description: 'Balti is a Tibetic language spoken in Baltistan. Unlike other Tibetan varieties, it retains archaic features lost even in Lhasa Tibetan.',
    culturalNotes: 'Baltistan is called the "Land of High Passes" — its language reflects centuries of Silk Road trade.',
  },
  {
    code: 'wbl', name: 'Wakhi', nativeName: 'وخی',
    region: 'Gojal (Upper Hunza) — Gilgit-Baltistan', speakerCount: 58000,
    status: 'endangered', script: 'latin', isRTL: false,
    description: 'Wakhi is an Eastern Iranian language spoken in the Gojal valley near the Chinese and Afghan borders.',
    culturalNotes: 'Wakhi speakers are Ismaili Muslims; their poetry often uses natural imagery of the Pamir mountains.',
  },
  {
    code: 'trw', name: 'Torwali', nativeName: 'تروالی',
    region: 'Swat Kohistan — KPK', speakerCount: 80000,
    status: 'endangered', script: 'nastaliq', isRTL: true,
    description: 'Torwali is a Dardic language spoken in the Bahrain area of Swat Kohistan. It has been actively documented by local linguists.',
    culturalNotes: 'Torwali has a vibrant oral folklore tradition; community-led literacy programs started in the 2010s.',
  },
  {
    code: 'kls', name: 'Kalasha', nativeName: 'کالاشہ',
    region: 'Kalash Valleys, Chitral — KPK', speakerCount: 5000,
    status: 'critically_endangered', script: 'latin', isRTL: false,
    description: 'Kalasha is spoken by the indigenous Kalash people of three valleys in Chitral. With only ~5,000 speakers, it is one of Pakistan\'s most endangered languages.',
    culturalNotes: 'The Kalash are famous for their pre-Islamic festivals (Chilam Joshi, Uchal) and unique cultural dress.',
  },
];

module.exports = { LANGUAGES };
