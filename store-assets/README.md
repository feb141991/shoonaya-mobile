# Shoonaya Store Assets

These are release assets, not application-bundle assets.

## Google Play

- `google-play/feature-graphic-1024x500.png`: final opaque 24-bit PNG,
  exactly 1024 x 500.
- `google-play/feature-graphic-background.png`: generated source artwork for
  future non-destructive revisions.
- `google-play/phone-screenshots/`: eight 1080 x 1920 opaque PNG screenshots.

The feature background was generated with OpenAI image generation on
2026-08-30, then the exact Shoonaya name and tagline were typeset locally with
the repository's Cormorant Garamond font. It contains no deity, exclusive
tradition symbol, watermark, device frame or fabricated UI.

## Screenshot provenance gate

The Android screenshots were captured from EAS preview build 21. They satisfy
Google's file constraints and accurately show that build. They must be
re-captured or explicitly re-approved after the final release build if any
visible application UI changes after build 21. Dependency-only or launch-screen
changes do not alter the pictured screens, but final-build provenance should
still be recorded before upload.

Do not reuse Android captures for the App Store. Capture iPhone screenshots
from the final iOS/TestFlight build.
