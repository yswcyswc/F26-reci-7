import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { matchGuess } from '../src/wordle';

// Recitation Part 1: follow along with your TA, filling in the todos below.
// Problem set Task 1: keep adding properties until `npm run mutants:wordle`
// kills every mutant. Read the spec in src/wordle/matchGuess.ts.
//
// Label every property with its pattern, on the line above its `it(`:
//   // Pattern: invariant. The result always has exactly five colors.
// (invariant, algebraic, metamorphic, differential, or conditional)

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Step 1: a generator for five-letter uppercase words.
const wordForm = (letters: string) => 
  fc.array(fc.constantFrom(...letters.split('')), { minLength: 5, maxLength: 5 }).map(chars => chars.join(''));
const word = wordForm(ALPHABET);

const yellowCase = fc.tuple(
  fc.integer({ min: 0, max: 4 }),
  fc.integer({ min: 1, max: 4 }),
).map(([secretIndex, offset]) => {
  const secret = 'ABCDE';
  const guessIndex = (secretIndex + offset) % 5;
  const guess = ['F', 'F', 'F', 'F', 'F'];
  guess[guessIndex] = secret[secretIndex];
  return { secret, guess: guess.join(''), guessIndex };
});

const greenPriorityCase = fc.integer({ min: 0, max: 25 }).map(index => {
  const a = ALPHABET[index];
  const b = ALPHABET[(index + 1) % 26];
  const absent = ALPHABET[(index + 2) % 26];
  return {
    secret: `${a}${a}${b}${a}${a}`,
    originalGuess: `${absent}${a}${b}${a}${a}`,
    changedGuess: `${b}${a}${b}${a}${a}`,
  };
});

describe('matchGuess', () => {
  // Pattern: invariant. The result always has exactly five colors.
  it('returns exactly five colors', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        expect(matchGuess(secret, guess)).toHaveLength(5);
      }),
    );
  });

  // Pattern: invariant. Every color is G, Y, or B.
  it('only uses the colors G, Y, B', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        for (const c of matchGuess(secret, guess)) expect(['G', 'Y', 'B']).toContain(c);
      }),
    );
  });

  // Pattern: conditional. If the guess is the secret, every color is green.
  it('guessing the secret gives all greens', () => {
    fc.assert(
      fc.property(word, w => {
        expect(matchGuess(w, w)).toEqual(['G', 'G', 'G', 'G', 'G']);
      }),
    );
  });
  
  // Pattern: invariant. A letter is never credited more times than it appears in the secret.
  it('never credits a letter more times than the secret contains it', () => {
    fc.assert(
      fc.property(word, word, (secret, guess) => {
        const result = matchGuess(secret, guess);
        for (const letter of new Set(guess)) {
          const credited = [...guess].filter((c, i) => c === letter && result[i] != 'B').length;
          const inSecret = [...secret].filter(c => c === letter).length;
          expect(credited).toBeLessThanOrEqual(inSecret);
        }
      }),
    );
  });

  // Pattern: conditional. A letter found only at another position in the secret is yellow.
  it('marks a letter from another position as yellow', () => {
    fc.assert(
      fc.property(yellowCase, ({ secret, guess, guessIndex }) => {
        expect(matchGuess(secret, guess)[guessIndex]).toBe('Y');
      }),
    );
  });

  // Pattern: metamorphic. Replacing an absent guess letter with a duplicate already used by a green leaves the colors unchanged.
  it('does not credit a duplicate letter already used by a green', () => {
    fc.assert(
      fc.property(greenPriorityCase, ({ secret, originalGuess, changedGuess }) => {
        expect(matchGuess(secret, changedGuess)).toEqual(matchGuess(secret, originalGuess));
      }),
    );
  });
});
