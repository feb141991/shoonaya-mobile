# Native Store Privacy Evidence

Generated from `app.json`, installed dependencies and the backend data
inventory on 2026-08-24. This is an engineering worksheet, not a submitted
store declaration or legal approval.

## App Store

| Data type | Linked | Tracking | Purpose/evidence |
|---|---:|---:|---|
| Name and email | Yes | No | Account creation and authentication |
| Precise location | Yes | No | Nearby places/community and location-aware calendar |
| Sensitive information | Yes | No | Optional religious/spiritual personalization |
| Photos/videos | Yes | No | Optional profile/community images |
| Other user content | Yes | No | Community posts, comments, reflections and journals |
| User ID | Yes | No | Account and authorization |
| Device ID | Yes | No | Expo/FCM push token delivery |
| Product interaction | Yes | No | Saved practice/progress and personalization |

`@react-native-firebase/analytics` is absent. Firebase Core remains for app
registration/FCM. ATT is not added because no cross-company tracking path was
identified. `ios.privacyManifests` in `app.json` is the durable Expo source.

## Google Play

Declare account information, optional precise location, optional photos,
sensitive religious/profile information, user-generated content, app activity
needed for saved progress, and device/push identifiers. Data is linked to the
account where applicable and is used for app functionality/personalization,
not sale. Confirm encryption in transit, deletion-request URL and each
optional/required answer in Play Console before submission.

## Manual unknowns

- Final store questionnaire wording and policy-lawful basis.
- Provider backup retention and deletion limitations.
- Whether any future advertising SDK is added; current Native graph has none.
- Store-console answers have not been submitted by this repository change.
