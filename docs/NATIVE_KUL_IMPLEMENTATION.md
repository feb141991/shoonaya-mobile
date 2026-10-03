# Native KUL implementation scope

## Product boundary

KUL is the private family circle in Native Shoonaya. It is distinct from
Mandali (community discussion) and Guru lineage (spiritual teacher history).
The existing PWA remains unchanged; the backend work in the Shoonaya repo is
limited to Native bearer-authenticated API support for this client.

KUL is reached from Home and Profile rather than taking a sixth bottom-nav
slot. A signed-in member sees one family hub with four focused areas:

- **Home:** family identity, member list, upcoming family dates, and open tasks.
- **Sabha:** bounded family messages, with a simple send flow.
- **Practice:** assigned family tasks that link into the relevant Native practice.
- **Family:** a compact Vansh list and guardian-managed family records.

Members without a KUL can create one or join with an invite code. The Native
hub uses the existing `kuls`, `kul_members`, `kul_messages`,
`kul_tasks`, `kul_events`, and `kul_family_members` schema and RPCs. It does
not add a second family model.

## Trust and data contract

- All Native requests use `/api/native/kul...`, `getApiUser(request)`, and the
  returned bearer-scoped Supabase client. The API never uses a service-role
  client to serve a member request.
- The server derives the acting user, KUL ID, role, and assignee permissions;
  it ignores client-supplied ownership and group IDs for writes.
- Reads are bounded: at most 6 member profiles, 25 tasks, 30 messages, 100
  family records, and 100 family events per response. A failed section read
  fails the response instead of pretending the section is empty.
- Invite codes are generated on the server with cryptographic randomness and
  are returned only to guardians.
- The membership migration serializes create/join/leave per account and joins
  per KUL, enforcing the existing free/pro member limits atomically. Apply it
  through the reviewed migration rollout before enabling Native create/join
  in a release.
- Other members' Japa, Nitya, Pathshala, quiz, mood, streak, and location data
  are not returned. KUL practice sharing needs a separate explicit opt-in and
  a privacy contract before it can be added.
- Task completion is idempotent and may be performed only by its assignee or
  a guardian. Task deep links are selected from a fixed Native route map.
- Family dates stay within KUL. They are not inserted into the canonical
  sacred-observance calendar.
- The first release refreshes on screen focus and pull-to-refresh. Realtime,
  push reminders, invite rotation/revocation, pro entitlements, and activity
  sharing are follow-up scopes; none are simulated by the Native UI.

## Native API surface

| Method and route                | Purpose                                                           |
| ------------------------------- | ----------------------------------------------------------------- |
| `GET /api/native/kul`           | Return the authenticated user's KUL snapshot or the no-KUL state. |
| `POST /api/native/kul`          | Create a KUL or join one by invite code.                          |
| `POST /api/native/kul/messages` | Send one bounded Sabha message.                                   |
| `POST /api/native/kul/tasks`    | Guardian assigns a supported practice task.                       |
| `PATCH /api/native/kul/tasks`   | Assignee or guardian completes a task idempotently.               |
| `POST /api/native/kul/events`   | Guardian adds a family date.                                      |
| `POST /api/native/kul/family`   | Guardian adds a family-tree record.                               |

## Acceptance gates

1. Guest and signed-out states never issue KUL data requests and offer the
   existing sign-in gate.
2. Create/join flows use the existing atomic database RPCs; retries do not
   create duplicate memberships.
3. API responses are owner-scoped, role-checked, bounded, and contain no
   other-member practice history.
4. Invalid input, offline reads, empty sections, and failed writes have
   distinct, recoverable UI states.
5. Native lists refresh on focus and pull-to-refresh, preserve existing data
   during background refresh, and reject responses after an account switch.
6. Tests cover endpoint authorization, validation, bounds, role checks,
   idempotent completion, member limits, and the Native presentation contract.
7. Typecheck, targeted tests, full Native tests, and both repos' required
   graph updates pass. Migrations, production changes, deploys, and pushes are
   not part of this implementation task.

## Deliberately deferred

Private Realtime authorization and reconnect cursors, explicit family
activity-sharing consent and its member-by-member disclosure UI, ritual
notifications, tree editing beyond adding a record, member promotion/removal,
invite rotation, and calendar subscriptions need separate design/permission
work. This scope does not claim those features are live.
