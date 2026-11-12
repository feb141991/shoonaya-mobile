# Notification evidence review: what is known, what is not (2026-11-07)

Track 1 of `NOTIFICATION_STUDY_PLAN.md`. Searched 2026-11-07 across the closest fields: faith and prayer apps, meditation-app reminders, mobile-health
reminder trials, streak design and message framing. "Verified" means I read the abstract or the paper on the page named; "snippet" means a search result
summary only. I read no full text except where stated. This is a literature scan, not a systematic review.

## 1. Bottom line

1. **No peer-reviewed trial of push notifications in a prayer or devotional app exists in what I could find.** The closest evidence is a survey and some
   small pilots. Nothing here lets us say "this wording or frequency works for spiritual practice". Claims of that kind that I met were vendor or blog
   material.
2. **Notifications raise near-term opens a little to a lot, and the long-term benefit is unproven.** Two randomized micro-trials in health apps agree on
   the short term and are silent or neutral on staying engaged.
3. **Frequency is untested.** No trial varied how many notifications a person gets and measured disengagement. Habituation is a stated risk, not a measured
   result.
4. **Controlling wording provokes more resistance than autonomy-supportive wording, in message experiments outside apps.** The effects are small and the
   setting is not notifications.
5. **A displayed broken streak can lower later engagement, and offering a way to repair it reduces that.** Established in consumer-behaviour studies, not
   in devotional apps.

## 2. Evidence table

| Source | Design | What it supports | Limits | Status |
|---|---|---|---|---|
| [Laird et al., J Religion & Health 2024](https://pmc.ncbi.nlm.nih.gov/articles/PMC11061027/) | Cross-sectional survey, n = 1,031 paying US Pray.com subscribers | 52.18% (538) said the Daily Prayer reminder helped them use the app more often; it was the most-cited feature | Convenience sample of frequent users, self-report, no causation, **no data on fatigue or opt-outs**; the survey's own push invitation reached 339,026 subscribers with a 1.33% open rate (an invitation, not a content notification) | Verified (read) |
| [Bidargaddi et al., JMIR mHealth 2018](https://mhealth.jmir.org/2018/11/e10123) | Micro-randomized trial, 1,255 users of a workplace well-being app, 89 days | A tailored push raised the chance of engaging within 24 h by about 3.9% (risk ratio 1.039, 95% CI 1.01 to 1.08) | Small effect; weekend versus weekday difference not significant; a workplace app | Verified (abstract-level via search) |
| [Drink Less micro-trial, JMIR mHealth 2023](https://mhealth.jmir.org/2023/1/e38342) | Micro-randomized trial | Receiving a notification made opening the app within the next hour 3.5 times as likely (95% CI 2.91 to 4.25); **time to disengagement did not differ significantly across arms** | A single daily notification, frequency not varied; details differ between versions of the paper, so check the final text before quoting figures | Snippet |
| [Micro-randomized trial design paper](https://arxiv.org/pdf/2005.05880) | Methods paper | Defines habituation (reduced responsiveness to frequent stimuli) and the risk that burdensome prompts cause disengagement | A design paper, not a result | Snippet |
| [Silverman and Barasch, J Consumer Research 2023](https://doi.org/10.1093/jcr/ucac029) | Seven studies | Showing a broken streak lowers later engagement compared with showing an intact one; stronger when people blame themselves, weaker when the streak can be repaired | Not about notifications and not about devotion; I read the abstract-level summary only | Snippet |
| [Legate and Weinstein 2021](https://selfdeterminationtheory.org/wp-content/uploads/2021/05/2021_LegateWeinstein_CanWeCommunicate.pdf) and a 2022 PNAS preregistered experiment (n = 25,718, 89 countries; link not retrieved) | Longitudinal study and randomized message experiment on social-distancing messages | Controlling messages increased defiance and controlled motivation relative to autonomy-supportive ones; effects small (r about .07 to .10); behavioural intentions unchanged | Not app notifications; the PNAS figures are from a search summary | Snippet |
| [Kabir et al., arXiv 2024 (Islamic apps)](https://arxiv.org/abs/2402.02061) | Evaluation of 11 apps plus 10 interviews, using self-determination theory | Reports that apps under-serve autonomy, competence and relatedness; proposes personalised reminders | The abstract says nothing on notification fatigue; a search summary claimed some users turned notifications off, which **I could not confirm and am not using**; the PDF text could not be read | Verified (abstract only) |
| [Stecher, Sullivan and Huberty, JMIR mHealth 2021](https://mhealth.jmir.org/2021/12/e32794) | Randomized trial of personalised anchors in the Calm app | Context for habit anchoring in meditation apps; reports app-meditation adherence can be as low as 24% | Outcome results not retrieved | Snippet |

Earlier in this project (verified then): [Mehrotra et al., CHI 2016](https://discovery.ucl.ac.uk/1502364/1/CHI16.pdf) (alert modality, sender relationship,
presentation and task shape response; 20 users, 10,372 notifications), [Fitz et al., 2019](https://doi.org/10.1016/j.chb.2019.07.016) (three batches a day
reduced stress versus hourly; n = 237), [Pielot et al., 2014](https://ic.unicamp.br/~oliveira/doc/MHCI2014_An-in-situ-study-of-mobile-phone-notifications.pdf)
(about 63.5 notifications a day among 15 information workers), [Lally et al., 2010](https://bps.org.uk/research-digest/how-form-habit) (median 66 days, range
18 to 254; a missed day did not significantly harm habit formation), Apple's guidance on interruption levels, and vendor opt-in benchmarks
([Airship 2025](https://growth.airship.com/rs/313-QPJ-195/images/Airship-2025-Push-Notification-Benchmarks-EN.pdf?version=0): Android median 53.3%).

## 3. Not evidence (met, and not used)

- Claims of a 32% Headspace lift, a 35 to 45% devotional-app lift from prayer-time pushes, or Duolingo streak multipliers: vendor or blog statements with no
  design or source.
- A 25-person church-app pilot (4 weeks) seen only as a search snippet: too small and unverified to cite as a finding.
- Fogg's behaviour model, self-determination theory in general, and implementation intentions: established theory I cite from memory; they guide
  hypotheses and are not tested on our users.

## 4. What this means for Shoonaya (hypotheses to test, not conclusions)

| Question we face | What the evidence says | What we still need to learn from our users |
|---|---|---|
| How many nudges a day by default? | Prompts lift near-term opens; long-term retention benefit unproven; habituation risk; batching three times a day helped wellbeing | What count feels like invitation versus nagging, for each tradition and for people who practise at fixed times |
| Wording tone | Controlling wording provokes resistance in message research | Whether "Rise, bathe, begin" reads as reverent or as an order, and for whom |
| Streak language | A displayed break can lower engagement; repair softens it; habit research says one missed day matters little | Whether a spiritual practice should carry a streak at all, and what a return message should say |
| Time of day, night delivery | Batching evidence; sleep research is association only | Whether pre-dawn delivery is wanted or intrusive, silent or with sound |
| Privacy on the lock screen | No study found | Whether people share phones, and what they would not want shown |
| Whether anything we do works | No trial in a devotional app exists | Needs tap tracking first, then within-person comparisons |

## 5. Gaps worth saying out loud

No trial of notification frequency versus disengagement; no independent engagement data for Hallow or Muslim Pro; no study of religious-content lock-screen
privacy; nothing on Hindu, Sikh or Buddhist users in particular. Our own studies would be among the first evidence of their kind, which is a reason to keep
them small, careful and honest rather than to publish claims.
