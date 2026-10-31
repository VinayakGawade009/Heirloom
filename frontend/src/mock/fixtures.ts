import type { Fact, FactKind, Page, UncertainSpan } from '../types';

export function findSpan(text: string, phrase: string): { start: number; end: number } {
  const start = text.indexOf(phrase);
  if (start === -1) {
    throw new Error(`Phrase "${phrase}" not found in transcript text: "${text}"`);
  }
  return { start, end: start + phrase.length };
}

export function createFact(id: number, kind: FactKind, phrase: string, text: string): Fact {
  const span = findSpan(text, phrase);
  return {
    id,
    kind,
    text: phrase,
    start: span.start,
    end: span.end,
  };
}

export function createUncertainSpan(phrase: string, text: string): UncertainSpan {
  return findSpan(text, phrase);
}

// 1. "Letter from Nani, 1952"
const naniTranscript = [
  '15 अक्टूबर 1952',
  'प्रिय रमेश,',
  'यहाँ लखनऊ में अब मौसम बहुत सुहावना हो गया है।',
  'तुम्हारी भेजी हुई ऊनी शाल मुझे कल मिल गई।',
  'आशा है कि कमला और बच्चे भी सकुशल हैं।',
  'अपनी सेहत का ध्यान रखना और जल्दी खत लिखना।',
  'तुम्हारी नानी',
].join('\n');

const naniFacts: Fact[] = [
  createFact(1, 'date', '15 अक्टूबर 1952', naniTranscript),
  createFact(2, 'person', 'रमेश', naniTranscript),
  createFact(3, 'place', 'लखनऊ', naniTranscript),
  createFact(4, 'item', 'ऊनी शाल', naniTranscript),
  createFact(5, 'person', 'कमला', naniTranscript),
];

const naniUncertain: UncertainSpan[] = [
  createUncertainSpan('सुहावना', naniTranscript),
  createUncertainSpan('ऊनी शाल', naniTranscript),
  createUncertainSpan('सकुशल', naniTranscript),
];

// 2. "Recipe: kheer"
const kheerTranscript = [
  'खीर बनाने की विधि',
  '1 लीटर ताजा दूध धीमी आँच पर उबालें।',
  'आधा कप भीगे हुए बासमती चावल डालकर गाढ़ा होने तक पकाएँ।',
  'स्वादानुसार चीनी और कुटी हुई हरी इलायची मिलाएँ।',
  'ऊपर से कटे हुए बादाम डालकर गरमा-गरम परोसें।',
].join('\n');

const kheerFacts: Fact[] = [
  createFact(1, 'item', 'दूध', kheerTranscript),
  createFact(2, 'item', 'चावल', kheerTranscript),
  createFact(3, 'item', 'इलायची', kheerTranscript),
  createFact(4, 'item', 'बादाम', kheerTranscript),
];

// 3. "Diary, March 1961"
const diaryTranscript = [
  '12 मार्च 1961',
  'आज सुबह खेत पर गेहूँ की कटाई शुरू हुई।',
  'सूरज ढलने पर चाचाजी कानपुर से पहुँचे।',
  'रात को आँगन में बैठकर सबने पुराने दिनों की बातें कीं।',
].join('\n');

const diaryFacts: Fact[] = [
  createFact(1, 'date', '12 मार्च 1961', diaryTranscript),
  createFact(2, 'place', 'कानपुर', diaryTranscript),
  createFact(3, 'item', 'गेहूँ', diaryTranscript),
];

// 4. "Land record"
const landTranscript = [
  'मौजा रामनगर, खाता संख्या 42',
  'पूर्व दिशा में पुराना कुआँ और बरगद का पेड़ है।',
  'पश्चिम सीमा पर पक्की सड़क और सरकारी नहर बहती है।',
  'दिनांक 5 जुलाई 1938 को पटवारी द्वारा दर्ज।',
].join('\n');

const landFacts: Fact[] = [
  createFact(1, 'place', 'रामनगर', landTranscript),
  createFact(2, 'item', 'कुआँ', landTranscript),
  createFact(3, 'date', '5 जुलाई 1938', landTranscript),
];

// 5. "Postcard, 1948"
const postcardTranscript = [
  'बम्बई, 20 अगस्त 1948',
  'आदरणीय बाबूजी,',
  'हम सब यहाँ कुशलपूर्वक पहुँच गए हैं।',
  'समुद्र किनारे हवा ठंडी है और नया काम अच्छा चल रहा है।',
  'प्रणाम, सुरेश',
].join('\n');

const postcardFacts: Fact[] = [
  createFact(1, 'place', 'बम्बई', postcardTranscript),
  createFact(2, 'date', '20 अगस्त 1948', postcardTranscript),
  createFact(3, 'person', 'सुरेश', postcardTranscript),
];

// 7. "Wedding invitation"
const weddingTranscript = [
  'शुभ विवाह निमंत्रण',
  'परमपिता की असीम अनुकम्पा से',
  'चि. आनंद संग सौ. सुशीला',
  'शुभ लग्न: 24 नवंबर 1970',
  'स्थान: शांति भवन, बनारस',
].join('\n');

const weddingFacts: Fact[] = [
  createFact(1, 'person', 'आनंद', weddingTranscript),
  createFact(2, 'person', 'सुशीला', weddingTranscript),
  createFact(3, 'date', '24 नवंबर 1970', weddingTranscript),
  createFact(4, 'place', 'बनारस', weddingTranscript),
];

export const SEED_PAGES: Page[] = [
  {
    id: 1,
    title: 'Letter from Nani, 1952',
    image_url: '',
    status: 'done',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: 'Nani',
    approx_date: '1952-10-15',
    transcript: {
      text: naniTranscript,
      uncertain: naniUncertain,
      corrections: [],
    },
    translation: {
      language: 'English',
      text: [
        'October 15, 1952',
        'Dear Ramesh,',
        'The weather here in Lucknow has become very pleasant now.',
        'I received the woolen shawl you sent yesterday.',
        'Hope Kamla and the children are also doing well.',
        'Take care of your health and write back soon.',
        'Your Nani',
      ].join('\n'),
    },
    facts: naniFacts,
    added_at: '2026-10-30T09:00:00',
  },
  {
    id: 2,
    title: 'Recipe: kheer',
    image_url: '',
    status: 'done',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: 'Maa',
    approx_date: '1968',
    transcript: {
      text: kheerTranscript,
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: [
        'Method for making Kheer',
        'Boil 1 liter of fresh milk on low heat.',
        'Add half a cup of soaked Basmati rice and cook until thick.',
        'Stir in sugar to taste and crushed green cardamom.',
        'Garnish with sliced almonds and serve warm.',
      ].join('\n'),
    },
    facts: kheerFacts,
    added_at: '2026-10-30T09:15:00',
  },
  {
    id: 3,
    title: 'Diary, March 1961',
    image_url: '',
    status: 'done',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: 'Dadaji',
    approx_date: '1961-03-12',
    transcript: {
      text: diaryTranscript,
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: [
        'March 12, 1961',
        'Wheat harvesting began at the farm this morning.',
        'Uncle arrived from Kanpur at sunset.',
        'At night, everyone sat in the courtyard talking about old days.',
      ].join('\n'),
    },
    facts: diaryFacts,
    added_at: '2026-10-30T09:30:00',
  },
  {
    id: 4,
    title: 'Land record',
    image_url: '',
    status: 'done',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: 'Patwari',
    approx_date: '1938-07-05',
    transcript: {
      text: landTranscript,
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: [
        'Mauza Ramnagar, Khata No. 42',
        'To the east lies the old well and banyan tree.',
        'On the western boundary runs a paved road and government canal.',
        'Recorded by the Patwari on July 5, 1938.',
      ].join('\n'),
    },
    facts: landFacts,
    added_at: '2026-10-30T09:45:00',
  },
  {
    id: 5,
    title: 'Postcard, 1948',
    image_url: '',
    status: 'done',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: 'Suresh',
    approx_date: '1948-08-20',
    transcript: {
      text: postcardTranscript,
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: [
        'Bombay, August 20, 1948',
        'Respected Babuji,',
        'We have all arrived here safely.',
        'The sea breeze is cool and the new work is going well.',
        'Regards, Suresh',
      ].join('\n'),
    },
    facts: postcardFacts,
    added_at: '2026-10-30T10:00:00',
  },
  {
    id: 6,
    title: 'Letter to Dada',
    image_url: '',
    status: 'transcribing',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: null,
    approx_date: null,
    transcript: {
      text: '',
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: '',
    },
    facts: [],
    added_at: '2026-10-30T10:10:00',
  },
  {
    id: 7,
    title: 'Wedding invitation',
    image_url: '',
    status: 'done',
    error: null,
    model: 'gemma4:e2b',
    language_hint: 'Hindi',
    writer: 'Sharma Family',
    approx_date: '1970-11-24',
    transcript: {
      text: weddingTranscript,
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: [
        'Auspicious Wedding Invitation',
        'By divine grace',
        'Chi. Anand with Sau. Sushila',
        'Auspicious ceremony: November 24, 1970',
        'Venue: Shanti Bhavan, Banaras',
      ].join('\n'),
    },
    facts: weddingFacts,
    added_at: '2026-10-30T10:15:00',
  },
  {
    id: 8,
    title: 'Notebook page 14',
    image_url: '',
    status: 'error',
    error: {
      code: 'model_failed',
      message: 'The model could not read this page.',
    },
    model: 'gemma4:e2b',
    language_hint: null,
    writer: null,
    approx_date: null,
    transcript: {
      text: '',
      uncertain: [],
      corrections: [],
    },
    translation: {
      language: 'English',
      text: '',
    },
    facts: [],
    added_at: '2026-10-30T10:20:00',
  },
];

const cannedTranscript = [
  '10 मई 1965',
  'प्रिय भाई,',
  'पुणे से भेजा हुआ पार्सल आज मिल गया।',
  'किताबें बहुत सुंदर हैं और बच्चे खुश हैं।',
  'तुम्हारा, मोहन',
].join('\n');

export const CANNED_PAGE_DATA = {
  transcript: cannedTranscript,
  translation: [
    'May 10, 1965',
    'Dear Brother,',
    'The parcel sent from Pune arrived today.',
    'The books are very nice and the children are happy.',
    'Yours, Mohan',
  ].join('\n'),
  facts: [
    createFact(1, 'date', '10 मई 1965', cannedTranscript),
    createFact(2, 'place', 'पुणे', cannedTranscript),
    createFact(3, 'item', 'किताबें', cannedTranscript),
    createFact(4, 'person', 'मोहन', cannedTranscript),
  ],
  uncertain: [
    createUncertainSpan('पार्सल', cannedTranscript),
  ],
};
