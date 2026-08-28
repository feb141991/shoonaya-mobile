# Shoonaya Bal-Gokul: Kids & Wisdom Tales Roadmap

**Status**: 📋 FUTURE SPECIFICATION / ROADMAP TRACKER  
**Module Identifier**: `kids-wisdom-tales` / `katha-sagar`  
**Target Surface**: `app/(tabs)/pathshala/kids.tsx` & `components/kids/*`  
**Cross-References**: [Dharma Web Cross-Linking Engine](file:///Users/Business(C)/shoonaya-mobile/docs/NATIVE_ROUTE_SURFACING_MATRIX.md), [Nava-vidha Bhakti Architecture](file:///Users/Business(C)/shoonaya-mobile/AGENTS.md)

---

## 1. Vision & Executive Summary

**Shoonaya Bal-Gokul** is a dedicated, sacred, and engaging wisdom ecosystem designed for children, young seekers, and families. It brings timeless Dharmic literature (*Panchatantra, Hitopadesha, Jataka Tales, Itihasa, and Puranic Kathas*) into the modern mobile era through:
- **Illustrated Bite-Sized Storybooks** with Shoonaya clay-art aesthetics.
- **Bilingual Audio Bedtime Narrations** (*Ratri Sandhya Mode*).
- **Interactive "Dharmic Dilemma" Decision Checkpoints** (*What would you do?*).
- **Vedic Character Badges** (Tracking virtues: *Satya, Viveka, Dhriti, Karuna, Shaurya*).

---

## 2. Core Content Collections

### A. Panchatantra (The 5 Canonical Tantras of Vishnu Sharma)
1. **Mitra-Bheda (*मित्रभेद - The Loss of Friends*)**:
   - Focus: Spotting manipulation, toxic friendships, and valuing honesty.
   - Core Story: *The Lion and the Bull (Pingalaka & Sanjivaka)*.
2. **Mitra-Lābha (*मित्रलाभ - Gaining True Friends*)**:
   - Focus: Building loyal community, unity, and mutual support.
   - Core Story: *The Four Friends (Deer, Turtle, Crow, Mouse)*.
3. **Sandhi-Vigraha (*संधिविग्रह - War, Peace & Strategy*)**:
   - Focus: Conflict resolution, diplomacy, and discerning deceit.
   - Core Story: *The War of Crows and Owls (Kākolūkīyam)*.
4. **Labdha-Praṇāśam (*लब्धप्रणाश - Loss of Gains*)**:
   - Focus: Guarding earned fruits, avoiding complacency, and remaining alert.
   - Core Story: *The Monkey and the Crocodile*.
5. **Aparīkṣita-Kārakam (*अपरीक्षितकारकम् - Hasty Action*)**:
   - Focus: Controlling impulsive anger, verifying facts before acting.
   - Core Story: *The Loyal Mongoose and the Brahmin’s Family*.

---

### B. Hitopadesha & Wisdom Fables
- **Hitopadesha (*हितोपदेश*)**: Practical life skills, filial respect, and character discipline.
- **Jātaka & Bodhisattva Parables**: Universal compassion (*Karuna*), self-sacrifice, and non-harm (*Ahimsa*).
- **Wit & Strategic Tales**: *Tenali Rama’s Dharmic Wit*, *Birbal’s Wisdom*, and *Vikram-Betaal Moral Inquiries*.

---

### C. Sacred *Kathās* & Child Icons of Itihāsa
- **Bhakta Prahlada**: Fearless devotion (*Bhakti*) standing steadfast against tyranny.
- **Dhruva Maharaj**: Unwavering focus (*Tapas & Sankalpa*) that moved the stars.
- **Nachiketa**: The child who questioned death and sought supreme truth from Yamaraja (*Katha Upanishad*).
- **Savitri & Satyavan**: Determination, intellect, and steadfast love overcoming fate.
- **Ekalavya & Shravan Kumar**: Devotion to the Guru and selfless service to parents (*Matru-Pitru Seva*).

---

## 3. Experience & UI Architecture

### 1. Visual Storybook Interface (`StorybookViewer.tsx`)
- **Clay-Art Visual Plates**: Full-color hand-crafted 3D clay assets matching Shoonaya token system.
- **Subhashita Verse Callout**: Every story concludes with an authentic Sanskrit couplet with English & Hindi transliteration.
- **Reading Time**: 2 to 4 minutes per story.

### 2. Audio Bedtime Mode (`KidsAudioPlayer.tsx`)
- **Prahara Aware**: Automatically promoted during *Sayahna* and *Ratri Sandhya* (7:30 PM - 9:30 PM).
- **Audio Profile**: Soothing narration backed by traditional flute, tanpura, and santoor ambient frequencies.
- **Sleep Timer**: 15m, 30m, or end-of-story auto-fade.

### 3. Interactive "Dharmic Dilemma" Decision Engine
- At critical story forks, the child or parent is asked to make a moral choice.
- Illustrates karmic consequences (*Karma-Phala*) and awards **+5 Karma Points (Viveka Badge)** upon completing reflection.

---

## 4. Cross-Content Dharma Web Linking

Every story within Bal-Gokul links seamlessly into the parent and core app surfaces:

```
                            ┌─────────────────────────────────────────┐
                            │     BAL-GOKUL STORY: Nachiketa's Vow    │
                            │     Theme: Unwavering Truth & Courage   │
                            └────────────────────┬────────────────────┘
                                                 │
                                                 ▼
       ┌───────────────────────────────────────────────────────────────────────────────────┐
       │                             CROSS-CONTENT LINKS                                   │
       ├──────────────────────────┬──────────────────────────┬─────────────────────────────┤
       │ 📖 Katha Upanishad Bridge│ 📿 Daily Sankalpa        │ 👥 Family / Kul Circle      │
       │ "Read Chapter 1 verse on │ "Set a 7-day truthfulness│ "Share tonight's bedtime    │
       │ the eternal soul (Atman)"│ vow with your family"    │ story to Kul WhatsApp"      │
       └──────────────────────────┴──────────────────────────┴─────────────────────────────┘
```

1. **Link to Bhagavad Gita / Upanishads**: Stories connect directly to matching philosophical verses.
2. **Link to Heroes of Bharat**: Fables on courage lead into real historical legends (*Shivaji Maharaj, Maharana Pratap*).
3. **Link to Family / Kul Circles**: 1-click sharing to family WhatsApp groups for bedtime discussion.
4. **Link to Mood Engine**: When a child or parent logs restlessness, the app suggests calming parables.

---

## 5. Implementation Milestones

- [ ] **Phase 1 (Data Schema & Canonical Snapshot)**:
  - Create static JSON catalogue `assets/data/panchatantra-catalogue.json` with 25 essential tales (5 per Tantra) containing full English, Hindi, Sanskrit subhashitas, and morality tags.
- [ ] **Phase 2 (UI Components & Story Viewer)**:
  - Build `components/kids/StoryCard.tsx`, `StoryReaderModal.tsx`, and `DharmicDilemmaPrompt.tsx`.
- [ ] **Phase 3 (Audio Narrations & Prahara Integration)**:
  - Integrate voice narrations into the Sarvam Bulbul / Cloudflare CDN pipeline with bedtime auto-timers.
- [ ] **Phase 4 (Gamification & Badges)**:
  - Connect completed stories to the Seeker Karma Ledger (`karma_ledger`) and award *Bal-Dharmic Virtues* badges.
