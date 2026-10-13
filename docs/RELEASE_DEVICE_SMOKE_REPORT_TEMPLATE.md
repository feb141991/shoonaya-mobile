# Exact-artifact device smoke report

Copy this file for each release candidate. Attach device screenshots or traces where useful; never include account credentials, push tokens, precise location, birth data, or private spiritual content.

## Artifact identity

- Date/time and timezone:
- Native repo commit SHA:
- Backend repo commit SHA / deployed deployment ID:
- Platform and device model:
- OS version:
- EAS profile / channel:
- App version and build number:
- EAS build ID and installable artifact URL:
- Tester:
- Test account class: synthetic / internal / opted-in

## Results

| Scenario | Pass / fail / blocked | Start condition | Observed result | Request ID / safe diagnostic reference |
|---|---|---|---|---|
| Fresh cold launch | | App force-closed; network available | | |
| Returning warm launch | | App backgrounded and reopened | | |
| Sign-in and session restore | | Signed-out synthetic test account | | |
| Home observance and Pill 2 | | Cold cache, then warm cache | | |
| Profile load and retry | | Cold cache, then offline/online recovery | | |
| One write and independent read-back | | Use synthetic data only | | |
| Account switch / sign-out cache boundary | | Two synthetic accounts | | |
| OTA/store update check | | Record installed and offered version | | |
| Push permission and receipt (if in scope) | | Real device and test notification | | |

## Network and stability notes

- Requests/statuses and durations:
- Failed/cancelled requests and stable error classes:
- Startup and interaction timings, if captured:
- Memory/crash observations:
- User-visible abandonment or blocked steps:
- Known limitations:

## Decision

- Release recommendation: pass / hold / rerun
- Blocking findings and owner:
- Evidence links:
