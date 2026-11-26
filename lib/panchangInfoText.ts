// Short explanations shown beside Panchang's rows, and on the Solar Day screen for the
// same windows. One copy for both screens, so the wording cannot drift (AGENTS.md
// sections 1 and 3). Moved verbatim from app/panchang.tsx on 2026-11-26.
export const PANCHANG_INFO_TEXT: Record<string, string> = {
  Tithi: 'Lunar day (1–30). Each tithi has a presiding deity and governs which activities are auspicious.',
  Nakshatra: "Moon's mansion in 1 of 27 star-clusters. Your moon nakshatra shapes emotion, instinct, and timing.",
  Yoga: 'Sun + Moon combined longitude across 27 yogas. Indicates the overall quality and nature of the day.',
  Karana: 'Half of a tithi — the moon moves 6° per karana. Governs the finer timing within each tithi for rituals.',
  Vara: 'Vedic day of the week. Each day has a ruling planet and presiding deity who blesses related acts.',
  Sunrise: 'Calculated for your location. Brahma Muhurta starts 96 minutes before sunrise — the ideal waking time.',
  Sunset: 'Sandhya kaal — ideal for evening prayers, japa, and quiet reflection as day meets night.',
  'Brahma Muhurta': 'The sacred pre-dawn window — 96 to 48 minutes before sunrise. The best time for meditation, japa, and pranayama.',
  'Rahu Kaal': 'A 90-min daily window ruled by Rahu (shadow planet). Avoid starting new ventures or auspicious acts.',
  'Abhijit Muhurat': 'The most auspicious ~48-min window around solar noon. Ideal for important new beginnings.',
};
