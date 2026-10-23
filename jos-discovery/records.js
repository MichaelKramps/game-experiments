// Jo's Discovery — the Archive. Four records per program; R04 always holds
// the family member's entry. While encoded, only the program name, the
// document ID and six-digit patient numbers stay readable.
//
// Score rule (shared with Evergreen's wellness checks): OVERALL is exactly
// the average of Focus, Stamina and Compliance.
//
// Keep these inside the "Jo may / must not learn" lines in DESIGN.md.

const RECORDS = {
  SAPWOOD: [
    {
      docId: 'SW-EX-0302',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: SAPWOOD     Document: SW-EX-0302
Cohort: 14     Check: 2

Subject: 615882 (Dana Whitcomb)     Tier: 1
Focus Index ...................... 71  (+3 since intake)
Stamina Index .................... 70  (+3 since intake)
Compliance Index ................. 27  (+2 since intake)
OVERALL .......................... 56

Subject: 617340 (Theo Alvarez)     Tier: 1
Focus Index ...................... 74  (+5 since intake)
Stamina Index .................... 72  (+4 since intake)
Compliance Index ................. 31  (+6 since intake)
OVERALL .......................... 59

Subject: 618905 (Priya Nandakumar)     Tier: 2
Focus Index ...................... 69  (+1 since intake)
Stamina Index .................... 68  (+2 since intake)
Compliance Index ................. 25  (+1 since intake)
OVERALL .......................... 54

Team lead note: Cohort 14 responding within projection.
618905 arrives after morning refreshments are cleared most
days. Supervisor to move her stand-up earlier.`,
    },
    {
      docId: 'SW-EX-0517',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: SAPWOOD     Document: SW-EX-0517
Cohort: 14     Check: 4

Subject: 616204 (Grant Feld)     Tier: 1
Focus Index ...................... 77  (+9 since intake)
Stamina Index .................... 75  (+8 since intake)
Compliance Index ................. 31  (+7 since intake)
OVERALL .......................... 61

Subject: 618011 (Helen Osei)     Tier: 2
Focus Index ...................... 79  (+10 since intake)
Stamina Index .................... 76  (+9 since intake)
Compliance Index ................. 34  (+9 since intake)
OVERALL .......................... 63

Subject: 619377 (Curtis Vail)     Tier: 1
Sleep Quality .................... 58  (-11 since intake)
Focus Index ...................... 72  (+6 since intake)
Stamina Index .................... 70  (+5 since intake)
Compliance Index ................. 29  (+5 since intake)
OVERALL .......................... 57

Team lead note: 619377 reports difficulty sleeping. Not a
concern at this stage. Advise him to avoid caffeine after
noon. Morning refreshments unchanged.`,
    },
    {
      docId: 'SW-EX-0640',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: SAPWOOD     Document: SW-EX-0640
Cohort: 14     Check: 5

Subject: 614470 (Lena Brandt)     Tier: 2
Focus Index ...................... 82  (+13 since intake)
Stamina Index .................... 80  (+12 since intake)
Compliance Index ................. 36  (+12 since intake)
OVERALL .......................... 66

Subject: 617340 (Theo Alvarez)     Tier: 1
Focus Index ...................... 80  (+11 since intake)
Stamina Index .................... 78  (+10 since intake)
Compliance Index ................. 40  (+15 since intake)
OVERALL .......................... 66

Subject: 620115 (Owen Pike)     Tier: 1
Focus Index ...................... 70  (+2 since intake)
Stamina Index .................... 69  (+2 since intake)
Compliance Index ................. 23  (+0 since intake)
OVERALL .......................... 54

Team lead note: 617340 Compliance ahead of projection;
refer to GRAFT at next review. 620115 declines morning
refreshments. Elevated resting heart rate at Check 3,
filed by site nurse as routine. Supervisor to encourage
participation.`,
    },
    {
      docId: 'SW-EX-0811',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: SAPWOOD     Document: SW-EX-0811
Cohort: 15     Check: 6

Subject: 618977 (Kim Sato)     Tier: 1
Focus Index ...................... 75  (+7 since intake)
Stamina Index .................... 73  (+6 since intake)
Compliance Index ................. 32  (+7 since intake)
OVERALL .......................... 60

Subject: 619106 (Rosa Ibarra)     Tier: 1
Focus Index ...................... 76  (+8 since intake)
Stamina Index .................... 74  (+7 since intake)
Compliance Index ................. 33  (+9 since intake)
OVERALL .......................... 61

Subject: 619043 (Jo Taylor)     Tier: 1     Check: 6
Cardiovascular Health ............ 88
Respiratory Health ............... 87
Metabolic Health ................. 85
Bloodwork Panel .................. 84
Sleep Quality .................... 71
Nutrition ........................ 79

Focus Index ...................... 84  (+16 since intake)
Stamina Index .................... 81  (+14 since intake)
Compliance Index ................. 39  (+15 since intake)

OVERALL .......................... 68

Team lead note: Focus and Stamina gains ahead of cohort.
Compliance trending slower than projected. Continue morning
refreshments at current dosage; reassess at Check 8.`,
    },
  ],

  GRAFT: [
    {
      docId: 'GR-EX-1120',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: GRAFT     Document: GR-EX-1120
Formulation: GR-2     Review band: Tier 2

Subject: 611208 (Will Harrow)     Tier: 2     Check: 88
Focus Index ...................... 85
Stamina Index .................... 83
Compliance Index ................. 63  (+9 since GR-2)
OVERALL .......................... 77

Subject: 609554 (Neil Okafor)     Tier: 2     Check: 104
Focus Index ...................... 87
Stamina Index .................... 84
Compliance Index ................. 66  (+7 since GR-2)
OVERALL .......................... 79

Subject: 612930 (Marta Kowal)     Tier: 2     Check: 71
Focus Index ...................... 83
Stamina Index .................... 82
Compliance Index ................. 51  (+3 since GR-2)
OVERALL .......................... 72

Director note: GR-2 response adequate across the band.
612930 below target. Move to GR-3 at the next refreshment
cycle and reassess at Check 74.`,
    },
    {
      docId: 'GR-EX-1204',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: GRAFT     Document: GR-EX-1204
Formulation: GR-3     Review band: Mixed

Subject: 612930 (Marta Kowal)     Tier: 2     Check: 74
Focus Index ...................... 84
Stamina Index .................... 82
Compliance Index ................. 65  (+14 on GR-3)
OVERALL .......................... 77

Subject: 617340 (Theo Alvarez)     Tier: 1     Check: 7
Focus Index ...................... 81
Stamina Index .................... 79
Compliance Index ................. 44  (GR-1 intake)
OVERALL .......................... 68

Subject: 605871 (Arthur Lyle)     Tier: 3     Check: 230
Focus Index ...................... 90
Stamina Index .................... 87
Compliance Index ................. 81  (stable)
OVERALL .......................... 86

Director note: GR-3 effective. 612930 reports flattened
mood and reduced appetite; within tolerance. 617340
referred from SAPWOOD. Supervisors are not to be told of
formulation changes.`,
    },
    {
      docId: 'GR-EX-1311',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: GRAFT     Document: GR-EX-1311
Formulation: GR-3 / GR-4     Review band: Mixed

Subject: 397015 (Joan Mercer)     Tier: 3     Check: 389
Status ........................... RESOLVED

Subject: 608812 (Sam Duarte)     Tier: 2     Check: 140
Focus Index ...................... 86
Stamina Index .................... 85
Compliance Index ................. 48  (-11 since last check)
OVERALL .......................... 73

Subject: 611208 (Will Harrow)     Tier: 2     Check: 91
Focus Index ...................... 86
Stamina Index .................... 84
Compliance Index ................. 70  (+7 since Check 88)
OVERALL .......................... 80

Director note: 608812 Compliance falling. Subject has asked
a colleague who supplies the morning refreshments. Move to
GR-4. If the trend continues, handle as with 397015.`,
    },
    {
      docId: 'GR-EX-1402',
      text: `EVERGREEN WELLNESS & LONGEVITY MONITORING — INTERNAL
Program: GRAFT     Document: GR-EX-1402
Formulation: GR-4     Review band: Long tenure

Subject: 605871 (Arthur Lyle)     Tier: 3     Check: 233
Focus Index ...................... 92
Stamina Index .................... 87
Compliance Index ................. 82  (stable)
OVERALL .......................... 87

Subject: 608812 (Sam Duarte)     Tier: 2     Check: 143
Focus Index ...................... 85
Stamina Index .................... 84
Compliance Index ................. 62  (+14 on GR-4)
OVERALL .......................... 77

Subject: 402277 (Marcus Odom)     Tier: 3     Check: 412
Cardiovascular Health ............ 90
Respiratory Health ............... 88
Metabolic Health ................. 89
Bloodwork Panel .................. 87
Sleep Quality .................... 85
Nutrition ........................ 86

Focus Index ...................... 91
Stamina Index .................... 89
Compliance Index ................. 93  (stable)

OVERALL .......................... 91

Director note: Long-term subject. Compliance holding above
target for this tenure band. Maintain GR-4 formulation in
morning refreshments. No adjustment recommended.
608812 responding. Review closed.`,
    },
  ],

  ROOTSTOCK: [
    {
      docId: 'RS-BP-0207',
      text: `EVERGREEN BASELINE REFERENCE PANEL
Program: ROOTSTOCK     Document: RS-BP-0207
Classification: Civilian / Non-employee
Acquisition: Passive     Consent: Not required     Notification: None

Subject: 731554 (Gloria Fenn)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Subject: 731560 (Raymond Fenn)
Genetic screen ......... No significant findings
Cardiovascular ......... Elevated LDL
Metabolic .............. Within reference range
Reference status ....... REJECTED (outside reference range)

Subject: 733019 (Ines Calder)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)`,
    },
    {
      docId: 'RS-BP-0233',
      text: `EVERGREEN BASELINE REFERENCE PANEL
Program: ROOTSTOCK     Document: RS-BP-0233
Classification: Civilian / Non-employee
Acquisition: Passive     Consent: Not required     Notification: None

Subject: 740112 (Martin Hale)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Subject: 740118 (Ada Hale)
Genetic screen ......... Recessive carrier, noted
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline, annotated)

Subject: 744306 (Daniel Ruiz)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Elevated fasting glucose
Reference status ....... REJECTED (reassigned)`,
    },
    {
      docId: 'RS-BP-0251',
      text: `EVERGREEN BASELINE REFERENCE PANEL
Program: ROOTSTOCK     Document: RS-BP-0251
Classification: Civilian / Non-employee
Acquisition: Passive     Consent: Not required     Notification: None

Subject: 745930 (Corinne Lacey)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Subject: 746207 (Paul Ng)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Subject: 746211 (Teresa Ng)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Note: Household match with 746207. Retain both for
longitudinal comparison.`,
    },
    {
      docId: 'RS-BP-0268',
      text: `EVERGREEN BASELINE REFERENCE PANEL
Program: ROOTSTOCK     Document: RS-BP-0268
Classification: Civilian / Non-employee
Acquisition: Passive     Consent: Not required     Notification: None

Subject: 747015 (Harold Quist)
Genetic screen ......... No significant findings
Cardiovascular ......... Mild hypertension
Metabolic .............. Within reference range
Reference status ....... REJECTED (reassigned)

Subject: 748455 (Nora Becket)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Subject: 748208 (Reese Taylor)
Genetic screen ......... No significant findings
Cardiovascular ......... Within reference range
Metabolic .............. Within reference range
Reference status ....... ACCEPTED (baseline)

Note: Household match with 748209. Retain both for
longitudinal comparison.`,
    },
  ],

  CANOPY: [
    {
      docId: 'CN-TR-0415',
      text: `EVERGREEN COGNITIVE RESPONSE TRIAL
Program: CANOPY     Document: CN-TR-0415
Delivery: [REDACTED]     Notification: None

Subject: 733019 (Ines Calder)
Cognitive Index (baseline) ...... 88
Cognitive Index (current) ....... 94
Response ........................ Strong
Note: Within projection.

Subject: 741802 (Jerome Pratt)
Cognitive Index (baseline) ...... 81
Cognitive Index (current) ....... 86
Response ........................ Moderate

Subject: 742660 (Alma Ruiz)
Cognitive Index (baseline) ...... 79
Cognitive Index (current) ....... 79
Response ........................ None
Note: Retest after delivery adjustment.`,
    },
    {
      docId: 'CN-TR-0442',
      text: `EVERGREEN COGNITIVE RESPONSE TRIAL
Program: CANOPY     Document: CN-TR-0442
Delivery: [REDACTED]     Notification: None

Subject: 745930 (Corinne Lacey)
Cognitive Index (baseline) ...... 90
Cognitive Index (current) ....... 97
Response ........................ Strong
Note: Subject described vivid dreams to her GP. GP note
acquired. No action.

Subject: 742660 (Alma Ruiz)
Cognitive Index (baseline) ...... 79
Cognitive Index (current) ....... 84
Response ........................ Moderate
Note: Delivery adjusted.

Subject: 744306 (Daniel Ruiz)
Cognitive Index (baseline) ...... 83
Cognitive Index (current) ....... 80
Response ........................ Adverse
Note: Headaches, lapses in recall. Delivery discontinued
for this household.`,
    },
    {
      docId: 'CN-TR-0478',
      text: `EVERGREEN COGNITIVE RESPONSE TRIAL
Program: CANOPY     Document: CN-TR-0478
Delivery: [REDACTED]     Notification: None

Subject: 746207 (Paul Ng)
Cognitive Index (baseline) ...... 85
Cognitive Index (current) ....... 91
Response ........................ Strong

Subject: 746211 (Teresa Ng)
Cognitive Index (baseline) ...... 84
Cognitive Index (current) ....... 85
Response ........................ Negligible

Subject: 747015 (Harold Quist)
Cognitive Index (baseline) ...... 76
Cognitive Index (current) ....... 70
Response ........................ Adverse
Note: Disorientation reported by family. Delivery
discontinued. Continue to monitor.`,
    },
    {
      docId: 'CN-TR-0502',
      text: `EVERGREEN COGNITIVE RESPONSE TRIAL
Program: CANOPY     Document: CN-TR-0502
Delivery: [REDACTED]     Notification: None

Subject: 740112 (Martin Hale)
Cognitive Index (baseline) ...... 82
Cognitive Index (current) ....... 88
Response ........................ Strong

Subject: 748455 (Nora Becket)
Cognitive Index (baseline) ...... 87
Cognitive Index (current) ....... 92
Response ........................ Strong

Subject: 748209 (Jamie Taylor)
Cognitive Index (baseline) ...... 96
Cognitive Index (current) ....... 95
Response ........................ Negligible
Note: Confounding substance use. Baseline profile exceptional.
Flag for future program interest.`,
    },
  ],

  EVERGREEN: [
    {
      docId: 'EV-AL-0091',
      text: `EVERGREEN SAMPLE ALLOCATION LOG
Program: EVERGREEN     Document: EV-AL-0091
Objective: Lifespan extension

Sample   Source   Classification               Line   Projected lifespan
E-0102   733019   Standard                     M-09   +2%
E-0107   745930   Standard                     M-09   +3%
E-0119   740112   Standard                     M-11   +1%
E-0124   748210   Atypical genetic structure   M-11   +19%
E-0125   748210   Atypical genetic structure   M-11   +17%

Note: Standard sources show no meaningful effect.
Prioritize 748210 allocations.`,
    },
    {
      docId: 'EV-AL-0104',
      text: `EVERGREEN SAMPLE ALLOCATION LOG
Program: EVERGREEN     Document: EV-AL-0104
Objective: Lifespan extension

Sample   Source   Classification               Line   Projected lifespan
E-0188   746207   Standard                     M-11   +1%
E-0201   748210   Atypical genetic structure   M-12   +24%
E-0202   748210   Atypical genetic structure   M-12   +21%
E-0215   731554   Standard                     M-12   +0%
E-0230   748210   Atypical genetic structure   M-14   +26%

Note: Atypical response reproduced across lines.`,
    },
    {
      docId: 'EV-AL-0117',
      text: `EVERGREEN SAMPLE ALLOCATION LOG
Program: EVERGREEN     Document: EV-AL-0117
Objective: Lifespan extension

Sample   Source   Classification               Line   Projected lifespan
E-0260   748210   Atypical genetic structure   M-14   +27%
E-0261   748210   Atypical genetic structure   M-14   +29%
E-0284   745930   Standard                     M-14   +2%
E-0290   748210   Atypical genetic structure   M-15   +33%

Note: Archived 748210 stock below allocation threshold.
Restrict to Line M-14 and later.`,
    },
    {
      docId: 'EV-AL-0130',
      text: `EVERGREEN SAMPLE ALLOCATION LOG
Program: EVERGREEN     Document: EV-AL-0130
Objective: Lifespan extension

Sample   Source   Classification               Line   Projected lifespan
E-0311   748210   Atypical genetic structure   M-14   +22%
E-0312   748210   Atypical genetic structure   M-14   +31%
E-0318   740118   Standard                     M-14   +1%
E-0340   748210   Atypical genetic structure   M-17   +38%
E-0352   748210   Atypical genetic structure   M-17   +41%
E-0353   748210   Atypical genetic structure   M-17   +36%

Source 748210: Mabel Taylor     Status: Archived`,
    },
  ],
};
