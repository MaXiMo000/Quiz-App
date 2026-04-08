# Adaptive difficulty, confidence & generation modes

This document describes **how QuizNest picks difficulty** for adaptive question generation, **how “confidence” is computed** for the knowledge profile UI, and **how the three generation modes** interact with the **session performance** signal (`low` / `medium` / `high`).

**Code map**

| Concern | Primary code |
|--------|----------------|
| Session tier from score (`low`/`medium`/`high`) | `frontend/src/utils/adaptiveQuizSignals.js` → `scoreToPerformance` |
| What gets sent to the API (mode + performance) | `frontend/src/utils/adaptiveQuizPlan.js` → `computeAdaptiveGenerationPlan` |
| Reports → recommended difficulty + **confidence** | `backend/services/knowledgeLevelService.js` → `computeRecommendedDifficultyFromReports`, `enrichedScore`, `scoreToDifficulty` |
| Final difficulty for AI | `backend/services/knowledgeLevelService.js` → `resolveAdaptiveDifficulty`, `blendDifficulties`, `performanceToDifficulty` |
| HTTP handler | `backend/controllers/aiQuestionController.js` → `generateAdaptiveQuestions` |
| Score thresholds for “pass” bands | `backend/services/aiQuestionGenerator.js` → `SCORE_THRESHOLDS` |

---

## 1. Session performance (`low` | `medium` | `high`)

This is **not** the same as the final `easy` / `medium` / `hard` sent to the AI. It is a **coarse signal** from the **most recent attempt** (or explicit choice encoded in the app flow).

### 1.1 From score / total (frontend + persisted session)

`scoreToPerformance(score, total)` (`adaptiveQuizSignals.js`):

- `ratio = score / total`
- `ratio ≥ 0.85` → **`high`**
- `ratio ≥ 0.55` → **`medium`**
- else → **`low`**

After a quiz, the app can store this in **sessionStorage** (`persistLastQuizSession`) so the adaptive screen can read it even without query parameters.

### 1.2 Effective performance on the adaptive page

Order used when building the API payload (see `getEffectiveSessionPerformance` + `computeAdaptiveGenerationPlan`):

1. `performance` query param, if valid (`low`|`medium`|`high`)
2. Else last completed quiz payload in sessionStorage (same tiers)
3. Else **`medium`**

---

## 2. Generation modes (`difficultyMode`)

The UI / URL selects one of:

| Mode | Meaning |
|------|--------|
| **`performance`** (“Session only”) | Ignore long-term profile. Final difficulty comes **only** from session performance → see §4.1. |
| **`intelligent`** (“Smart / profile”) | Use **knowledge profile** only (reports, level, prefs, cold start). The **latest session performance tier** (`low`/`medium`/`high`) is **not** blended in — this is *not* “level and preference only”; **past quiz reports in the topic** still drive recommended difficulty and **confidence**. |
| **`blended`** | Combine **profile-based** difficulty with **session** difficulty (see §4.2). |

**Frontend plan** (`computeAdaptiveGenerationPlan`): if the URL includes `difficultyMode`, that mode wins. If not, the app may default to **blended** when a session signal exists, otherwise **intelligent**-style behaviour depending on loading and history (see inline logic in that file).

**Backend** (`generateAdaptiveQuestions`): validates `difficultyMode` and calls `resolveAdaptiveDifficulty({ difficultyMode, performance }, userId, quiz)`.

---

## 3. Knowledge profile: enriched scores → recommended difficulty → **confidence**

The profile is built from **saved quiz reports** in the same topic (plus fallbacks). The **confidence** number in the UI (e.g. **70%**) answers: *“How much do we trust this topic-specific estimate?”* — not “probability of passing the next quiz.”

### 3.1 Per-report score: `enrichedScore(report)`

For each report:

1. **Base ratio**: `score / total`.
2. **Whole-quiz time penalty** (`timeAdjustedScore`): if the user took **much longer** than expected (questions × ~2 min × difficulty multiplier), the ratio is **slightly reduced** (capped).
3. **Per-question timing signal** (`analyseQuestionTiming`): uses per-question `answerTime` when present; wrong answers penalise more on **easy** items than on **hard**; very fast wrong answers penalise a bit more.

Result is clamped to **[0, 1]**.

### 3.2 Recommended difficulty from weighted average: `scoreToDifficulty(weightedAvg, confidence, preferredDifficulty)`

Uses global thresholds from `SCORE_THRESHOLDS` (`aiQuestionGenerator.js`):

- `strongPass` = **0.85** → recommend **`hard`**
- `pass` = **0.65** → **`medium`**
- `weak` = **0.5** → if user prefers **hard**, **`medium`**, else **`easy`**
- below weak → **`easy`**

`preferredDifficulty` comes from the user’s account preference (default `medium`).

### 3.3 Confidence formula (by data tier)

`computeRecommendedDifficultyFromReports` picks a **data tier**, then sets **confidence** (0–1) before calling `scoreToDifficulty`:

**Tier A — Rich topic history (≥ 3 reports in this topic)**
Recency-weighted average of `enrichedScore` (newer reports weigh more).

\[
\text{confidence} = \min\left(0.95,\ 0.7 + (\min(n,10) - 3) \times 0.025\right)
\]

where \(n\) = number of same-topic reports.

- **Exactly 3 reports** → \(0.7 + 0 = 0.7\) → **70%** in the UI.
- Each extra report (up to 10) adds **2.5%**, capped at **95%**.

**Tier B — Sparse topic history (1–2 reports)**
Blends: **60%** topic average, **20%** related-topic average (if any), rest **level prior** (`levelToSkillPrior(userLevel)`).

\[
\text{confidence} = \min\left(0.72,\ 0.48 + (\text{related? } 0.1 : 0) + n_{\text{topic}} \times 0.04\right)
\]

**Tier C — No same-topic reports, but ≥ 3 global reports**
Blend **62%** global average + **38%** level prior:

\[
\text{confidence} = 0.38 + \min(0.18,\ n_{\text{all}} \times 0.012)
\]

**Tier D — Few globals (1–2), no topic**
Fixed **0.36** confidence.

**Tier E — Cold start (no usable reports)**
Uses level prior, preference, optional authored-quiz prior; confidence **0.2**.

### 3.4 Confidence tier label (`high` / `medium` / `low`)

`confidenceTier(confidence)`:

- ≥ **0.75** → `high`
- ≥ **0.45** → `medium`
- else → `low`

---

## 4. Resolving final AI difficulty (`easy` | `medium` | `hard`)

`resolveAdaptiveDifficulty` (`knowledgeLevelService.js`):

### 4.1 Map performance → difficulty

`performanceToDifficulty`:

- `low` → **`easy`**
- `high` → **`hard`**
- `medium` → **`medium`**

### 4.2 Profile path: level hint, then optional blend

1. Load profile via `getKnowledgeProfileForQuiz` (same `computeRecommendedDifficultyFromReports` pipeline).
2. `difficulty = applyLevelHint(recommendedDifficulty, userLevel)` — high XP can **nudge** difficulty one step toward harder/medium when the model is still on easy/low ranks.
3. **`intelligent`**: use that `difficulty` as-is (source from profile e.g. `category`, `sparse_*`, `cold_start`, …).
4. **`blended`**:
   - If cold start with **zero** topic quizzes (`basedOnQuizzes === 0` and `dataSource === "cold_start"`): **no** blend with session; source `blended_cold`.
   - Else:
     \[
     \text{final} = \text{blendDifficulties}(\text{profileDifficulty},\ \text{performanceToDifficulty}(\text{performance}))
     \]
     `blendDifficulties` maps `easy=0`, `medium=1`, `hard=2`, averages the two ranks, rounds, maps back — e.g. **easy + easy → easy**, **medium + easy → medium**, **hard + medium → hard** (see `RANK` in code).

### 4.3 `performance` mode

Skips profile entirely: `difficulty = performanceToDifficulty(performance)`, source `last_session`.

---

## 5. End-to-end example (blended + “70% confidence”)

1. User has **3** finished quizzes in **history** (same topic) → **confidence = 70%**, recommended difficulty from weighted **enriched** scores (e.g. **easy**).
2. User just scored **0/5** → session **`low`** → `performanceToDifficulty` → **easy**.
3. **Blended**: `blendDifficulties(easy, easy)` → **easy** → AI generates **easy** MCQs.

If profile said **medium** and session **low** → `blendDifficulties(medium, easy)` → **easy** (rounded average of ranks 1 and 0 → 1? (0+1)/2=0.5 round=1 → medium). Let me verify: idx = round((1+0)/2)=round(0.5)=1 → medium. Good.

---

## 6. Maintainers: where to tune behaviour

- **Pass / fail bands** for *recommended* difficulty: `SCORE_THRESHOLDS` in `aiQuestionGenerator.js`.
- **Session tiers** from score: `scoreToPerformance` in `adaptiveQuizSignals.js` (keep aligned with any badge copy on the results modal).
- **Confidence curve** (70% at 3 quizzes, +2.5% per extra): `computeRecommendedDifficultyFromReports` in `knowledgeLevelService.js`.
- **Blend + level nudge**: `blendDifficulties`, `applyLevelHint`, `resolveAdaptiveDifficulty` in `knowledgeLevelService.js`.
