# Reflection

**Name / Andrew ID:** Cathy Wang / cathyw

**Recitation group members (Task 2):** individual (Our recitation didn't get enough time to work in a group)

---

### 1. Valid but weak

Pick a property you wrote that passes on the correct implementation but
kills few or no mutants. Why is it still a *valid* property? Describe a
concrete bug (not one of our mutants) that it *would* catch.

My invariant "returns exactly five colors" kills no public Wordle mutants, but it
is valid because the specification requires one color for each of the five guess
positions. It would catch a bug that accidentally returns only four colors by
skipping the last position.

### 2. A generator problem, not a property problem

Describe a mutant, from either task, that survived or was flaky because of
your **generator** rather than your property. What did the generator fail to
produce? How did you fix it? Paste the runner output from before and after.

At the end of recitation, `word` used `wordForm('ABC')`, making duplicate letters
common. I later switched `word` to `wordForm(ALPHABET)` (A–Z); with that generator,
the `singlePass` mutant was flaky. My letter-count invariant could detect it,
but random words did not always put a duplicate letter before a later green.
Even the small alphabet did not guarantee that ordering. I added `greenPriorityCase`, which
constructs that ordering directly, and a metamorphic property comparing it with
a guess whose first letter is absent from the secret. This made the kill reliable
without filtering generated inputs.

Before:

```text
~ singlePass     flaky: killed in 4/5 runs  by: never credits a letter more times than the secret contains it
Counterexample: ["AAEAA","EAEAA"]
AssertionError: expected 2 to be less than or equal to 1
```

After:

```text
✔ singlePass     killed  by: does not credit a duplicate letter already used by a green; never credits a letter more times than the secret contains it
Counterexample: [{"secret":"AABAA","originalGuess":"CABAA","changedGuess":"BABAA"}]
AssertionError: expected [ 'Y', 'G', 'G', 'G', 'G' ] to deeply equal [ 'B', 'G', 'G', 'G', 'G' ]
Mutation score: 5/5 killed (100%)
```

### 3. Reading a counterexample

Paste one counterexample that the mutation runner printed for a killed
mutant. In 2–3 sentences, explain using the *specification* why that input
exposes the bug.

```text
✔ greensOnly     killed  by: marks a letter from another position as yellow
Counterexample: [{"secret":"ABCDE","guess":"FAFFF","guessIndex":1}]
AssertionError: expected 'B' to be 'Y' // Object.is equality
```

The `A` at guess index 1 occurs at secret index 0, and no other guess position
uses that `A`. The specification therefore requires `Y` at index 1; returning
`B` incorrectly discards a valid yellow match.

### 4. Your project

Name one function or module in your team's project that would benefit from
property-based testing. State two properties in English, name the pattern of
each, and describe the generator you'd need, including anything about its
inputs that a naive generator would get wrong.

Our OpenCode `/group` feature has `analyzeRepositoryGroups` in
`packages/tui/src/util/repository-functionality.ts`. Two useful properties are:

1. **Invariant:** Every distinct, normalized, non-ignored input file appears exactly once
   across the returned top-level groups' `files` arrays. No input file is lost
   or counted twice, even when groups overflow into an "Other" group.
2. **Metamorphic:** Reordering the input paths and adding duplicate paths does
   not change the returned groups.

The generator should construct valid repository-relative paths across several
roots (`apps`, `packages`, `src`), with nested source/test directories,
duplicate paths, and referenced files chosen from those paths. It should also
sometimes create ignored paths such as `node_modules/...` and equivalent
spellings using `./` or backslashes. Some generated repositories should have
more than 30 top-level roots or 20 subareas to exercise overflow. A naive list
of unrelated root-level filenames would miss normalization, nested grouping,
reference ranking, and overflow cases.
