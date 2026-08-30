# Shoonaya Store Submission Metadata

Engineering-prepared worksheet. Console submission and final declarations
remain founder-owned manual actions.

## Product identity

- App name: `Shoonaya`
- Bundle/package ID: `com.shoonaya.app`
- Version: `1.0.0`
- Primary category: **Lifestyle**
- Apple secondary category: **Education**
- Google Play application type: **App**
- Google Play category: **Lifestyle**
- Designed for children: **No**
- Contains ads: **No** for the current Native build
- In-app purchases: **No** for the current Native build

Do not use Health & Fitness as a store category. Shoonaya includes optional
mood reflection but is not a medical, diagnostic or treatment product.

## Public URLs

- Marketing URL: https://www.shoonaya.com/
- Support URL: https://www.shoonaya.com/contact
- Privacy policy: https://www.shoonaya.com/privacy
- Terms: https://www.shoonaya.com/terms
- Data/account deletion information: https://www.shoonaya.com/data-deletion
- Content sources: https://www.shoonaya.com/sources

Both public pages now read the same `NEXT_PUBLIC_SUPPORT_EMAIL` deployment
configuration. Deploy the backend change and verify both pages show the same
working address before submission.

## Content rating answers

Use the console questionnaires; do not type a desired rating manually.

- User-generated content: **Yes** (Mandali posts, comments and reactions)
- Social or content exchange: **Yes**
- In-app reporting: **Yes**
- User blocking: **Yes**
- Moderation: **Yes**, subject to production operational verification
- Messaging/chat between users: **No direct private user messaging**
- AI chat: **Yes**, Dharma Mitra; it is an app assistant, not user-to-user chat
- Gambling, contests, loot boxes: **No**
- Sexual content/nudity: **No authored content**; UGC controls still apply
- Graphic violence: **No authored content**
- Profanity/crude humor: **No authored content**; UGC controls still apply
- Medical treatment/advice: **No**
- Unrestricted web access: **No**; external links open bounded destinations
- Location sharing between users: **Only when a user explicitly publishes a
  location-bearing community item; verify this wording in the questionnaire**

Because Mandali distributes user content and supports reactions/comments,
answer every UGC and online-interaction question conservatively. Let Apple and
IARC calculate the final regional ratings. Shoonaya must not be submitted to
Apple's Kids category.

## Store assets

- Google Play feature graphic:
  `store-assets/google-play/feature-graphic-1024x500.png`
- Google Play phone screenshots:
  `store-assets/google-play/phone-screenshots/`
- Screenshot provenance:
  `store-assets/google-play/screenshots-manifest.json`
- App Store iPhone screenshots: **pending final iOS build capture**

## Manual release-console checklist

- [ ] Enter support, privacy and deletion URLs.
- [ ] Ensure the same support email appears on all public pages.
- [ ] Complete Google Data Safety from `STORE_PRIVACY_EVIDENCE.md`.
- [ ] Complete Apple App Privacy from `STORE_PRIVACY_EVIDENCE.md`.
- [ ] Complete UGC/content-rating questionnaires accurately.
- [ ] Supply an active reviewer account and populated demo state.
- [ ] Upload final-build screenshots and record build identity.
- [ ] Upload Play feature graphic and add screenshot alt text.
- [ ] Confirm countries/regions and pricing (`Free`).
- [ ] Add reviewer contact details and phone number in each console.
