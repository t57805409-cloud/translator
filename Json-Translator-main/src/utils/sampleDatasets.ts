export interface SampleFolder {
  id: string;
  title: string;
  description: string;
  defaultSourceLang: string;
  defaultTargetLang: string;
  defaultContext: string;
  files: Array<{
    name: string;
    relativePath: string;
    content: string;
  }>;
}

export const SAMPLE_FOLDERS: SampleFolder[] = [
  {
    id: 'quran_arabic',
    title: 'Holy Quran Chapters (Arabic)',
    description: 'Multiple chapters in classical Arabic with verses, metadata, recitation and meaning fields.',
    defaultSourceLang: 'Arabic',
    defaultTargetLang: 'Tamil',
    defaultContext: 'Islamic scripture and theological texts with respectful, authentic vocabulary',
    files: [
      {
        name: 'surah_001_al_fatihah.json',
        relativePath: 'quran_chapters/surah_001_al_fatihah.json',
        content: JSON.stringify(
          {
            chapter_number: 1,
            name_arabic: "الفاتحة",
            name_english: "Al-Fatihah",
            title: "فاتحة الكتاب",
            meaning: "The Opening",
            total_verses: 7,
            revelation_type: "Meccan",
            summary: "أم الكتاب وسورة الصلاة والحمد لله رب العالمين",
            verses: [
              {
                id: 1,
                verse_number: 1,
                arabic_text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
                translation: "In the name of Allah, the Entirely Merciful, the Especially Merciful.",
                theme: "Seeking blessing and declaring divine mercy"
              },
              {
                id: 2,
                verse_number: 2,
                arabic_text: "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
                translation: "All praise is due to Allah, Lord of the worlds.",
                theme: "Universal praise of the Sustainer of all creation"
              },
              {
                id: 3,
                verse_number: 3,
                arabic_text: "الرَّحْمَٰنِ الرَّحِيمِ",
                translation: "The Entirely Merciful, the Especially Merciful.",
                theme: "Divine compassion"
              },
              {
                id: 4,
                verse_number: 4,
                arabic_text: "مَالِكِ يَوْمِ الدِّينِ",
                translation: "Sovereign of the Day of Recompense.",
                theme: "Lordship over the Day of Judgment"
              },
              {
                id: 5,
                verse_number: 5,
                arabic_text: "إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ",
                translation: "It is You we worship and You we ask for help.",
                theme: "Direct devotion and reliance upon Allah"
              },
              {
                id: 6,
                verse_number: 6,
                arabic_text: "اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ",
                translation: "Guide us to the straight path.",
                theme: "Supplication for divine guidance"
              },
              {
                id: 7,
                verse_number: 7,
                arabic_text: "صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ",
                translation: "The path of those upon whom You have bestowed favor, not of those who have evoked anger or of those who are astray.",
                theme: "The path of favor versus misguided ways"
              }
            ],
            notes: {
              scholarly_importance: "Recited in every unit of prayer by millions worldwide daily.",
              virtues: "Described by the Prophet as the greatest Surah in the Quran."
            }
          },
          null,
          2
        )
      },
      {
        name: 'surah_112_al_ikhlas.json',
        relativePath: 'quran_chapters/surah_112_al_ikhlas.json',
        content: JSON.stringify(
          {
            chapter_number: 112,
            name_arabic: "الإخلاص",
            name_english: "Al-Ikhlas",
            title: "سورة التوحيد الخالص",
            meaning: "The Sincerity / Absolute Purity",
            total_verses: 4,
            revelation_type: "Meccan",
            summary: "بيان وحدانية الله المطلقة ونفي الشريك والولد والمثيل",
            verses: [
              {
                id: 1,
                verse_number: 1,
                arabic_text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
                translation: "Say, 'He is Allah, [who is] One.'",
                theme: "Absolute Oneness (Tawhid)"
              },
              {
                id: 2,
                verse_number: 2,
                arabic_text: "اللَّهُ الصَّمَدُ",
                translation: "Allah, the Eternal Refuge.",
                theme: "Self-Sufficient Master upon whom all depend"
              },
              {
                id: 3,
                verse_number: 3,
                arabic_text: "لَمْ يَلِدْ وَلَمْ يُولَدْ",
                translation: "He neither begets nor is born.",
                theme: "Free from lineage or biological needs"
              },
              {
                id: 4,
                verse_number: 4,
                arabic_text: "وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ",
                translation: "Nor is there to Him any equivalent.",
                theme: "Unmatched and without equal in majesty"
              }
            ],
            notes: {
              virtues: "Equal to one-third of the Quran in foundational theological weight."
            }
          },
          null,
          2
        )
      }
    ]
  },
  {
    id: 'novel_english',
    title: 'Literary Book Chapters (English)',
    description: 'Fiction book chapters with narrative prose, dialogs, character descriptions, and scene cues.',
    defaultSourceLang: 'English',
    defaultTargetLang: 'Malayalam',
    defaultContext: 'Literary prose, fiction story with poetic imagery and expressive dialogues',
    files: [
      {
        name: 'chapter_01_the_awakening.json',
        relativePath: 'novel_chapters/chapter_01_the_awakening.json',
        content: JSON.stringify(
          {
            chapter: 1,
            title: "The Awakening at Silver Creek",
            location: "Misty Mountain Valley",
            synopsis: "Eldrin discovers the ancient glowing stone by the riverbed under the autumn dawn.",
            scenes: [
              {
                scene_id: "sc_01",
                time_of_day: "Dawn",
                narration: "A gentle amber dawn filtered through the misty cedar trees, painting ripples of gold along the swift currents of Silver Creek.",
                dialogue: [
                  {
                    speaker: "Eldrin",
                    quote: "Can you hear the river singing today, Master? It sounds different."
                  },
                  {
                    speaker: "Old Sage Rowan",
                    quote: "The water only echoes what the mountain already knows in silence, young traveler."
                  }
                ]
              },
              {
                scene_id: "sc_02",
                time_of_day: "Noon",
                narration: "Beneath the roots of the ancient willow, a smooth jade tablet rested, inscribed with forgotten runes that pulsed with faint cerulean light.",
                internal_monologue: "If the legends of our ancestors are true, this stone was placed here before the founding of the northern realm."
              }
            ],
            chapter_notes: "Sets the atmospheric tone and introduces the master-apprentice dynamic."
          },
          null,
          2
        )
      },
      {
        name: 'chapter_02_the_crossroads.json',
        relativePath: 'novel_chapters/chapter_02_the_crossroads.json',
        content: JSON.stringify(
          {
            chapter: 2,
            title: "Whispers at the Crossroads",
            location: "Highland Pass",
            synopsis: "The travelers meet the wandering bard who warns them of the shadows encroaching from the east.",
            scenes: [
              {
                scene_id: "sc_03",
                time_of_day: "Dusk",
                narration: "The highland wind carried the scent of pine smoke and distant rain as shadows lengthened across the stone path.",
                dialogue: [
                  {
                    speaker: "Wandering Bard",
                    quote: "Travelers of the high pass, do not kindle your lanterns tonight. The valley below is awake with watchful eyes."
                  },
                  {
                    speaker: "Eldrin",
                    quote: "We carry no treasures, only old parchment and memories."
                  }
                ]
              }
            ],
            chapter_notes: "Builds tension towards the journey to the eastern frontier."
          },
          null,
          2
        )
      }
    ]
  },
  {
    id: 'hadith_bilingual',
    title: 'Hadith Collection (Arabic & English)',
    description: 'Prophetic traditions with Arabic text, English translation, narrator chain, and commentary.',
    defaultSourceLang: 'Arabic',
    defaultTargetLang: 'Tamil',
    defaultContext: 'Hadith and Prophetic traditions with precise jurisprudential and moral meanings',
    files: [
      {
        name: 'hadith_01_intentions.json',
        relativePath: 'hadith_book/hadith_01_intentions.json',
        content: JSON.stringify(
          {
            collection: "Forty Hadith of An-Nawawi",
            hadith_number: 1,
            title: "Actions are by Intentions",
            narrator: "Amir al-Mu'minin Umar ibn al-Khattab",
            arabic_text: "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
            english_translation: "Actions are but by intention and every person shall have but that which he intended.",
            commentary: "This hadith is one of the greatest foundations of Islamic ethics, governing both external actions and internal sincerity.",
            lesson: "Sincerity turns ordinary daily deeds into acts of devotion and spiritual growth."
          },
          null,
          2
        )
      }
    ]
  }
];
