# Kundali Numerical Regression Fixtures

These fixtures are engineering regression evidence, not council-ratified
religious rulings. They exercise the production `generateAstroChart` path and
the documented mathematical contracts in `@sangam/panchang-engine`:

- Tithi: lunar elongation divided into 30 segments of 12 degrees.
- Nakshatra: sidereal lunar longitude divided into 27 equal segments.
- Yoga: normalized sum of sidereal solar and lunar longitude divided into 27.
- Karana: lunar elongation divided into 60 segments of 6 degrees.
- Transition solver: angular residual below 0.002 degrees at `endsAtUtc`.
- Civil time: IANA timezone round-trip must match the requested local clock.
- DST gaps and folds: rejected for user clarification; never silently selected.

Locations and dates in the test suite are synthetic, non-PII fixtures. Weekday
expectations are Gregorian civil-calendar facts. No fixture is presented as a
scholarly or council approval of Jyotish interpretation.
