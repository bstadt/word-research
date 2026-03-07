/**
 * Midnight batch scoring job.
 * Run with: npx tsx scripts/score.ts
 * Schedule via cron: 0 0 * * * cd /path/to/app && npx tsx scripts/score.ts
 *
 * Scoring rules:
 * - A word only counts if 10+ unique users have submitted it
 * - The word must not be in a standard dictionary (checked via dictionaryapi.dev)
 * - Users get points based on submission order percentile:
 *   1st user = 1.0 pts, 2nd = 0.9, ..., 10th = 0.1
 *   Beyond 10th, everyone gets 0 (but their submission still validates the word)
 */

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "data", "word-research.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en";
const MIN_SUBMISSIONS = 10;

async function isInDictionary(word: string): Promise<boolean> {
  try {
    const res = await fetch(`${DICT_API}/${encodeURIComponent(word)}`);
    return res.ok; // 200 = found in dictionary
  } catch {
    return false; // if API fails, assume it's novel
  }
}

async function main() {
  console.log("Starting score calculation...");

  // Find all words with 10+ unique submitters
  const candidates = db
    .prepare(
      `SELECT word, COUNT(DISTINCT user_id) as submitters
       FROM words GROUP BY word HAVING submitters >= ?`
    )
    .all(MIN_SUBMISSIONS) as { word: string; submitters: number }[];

  console.log(`Found ${candidates.length} candidate words with ${MIN_SUBMISSIONS}+ submissions`);

  // Reset all scores
  db.prepare("UPDATE users SET score = 0").run();

  const now = new Date().toISOString();
  const addScore = db.prepare(
    "UPDATE users SET score = score + ?, scored_at = ? WHERE id = ?"
  );

  let scoredWords = 0;

  for (const { word } of candidates) {
    // Check if word is already in standard dictionaries
    const inDict = await isInDictionary(word);
    if (inDict) {
      console.log(`  "${word}" — in dictionary, skipping`);
      continue;
    }

    scoredWords++;
    console.log(`  "${word}" — scoring`);

    // Get the first submission per user, ordered by time
    const submissions = db
      .prepare(
        `SELECT user_id, MIN(created_at) as first_at
         FROM words WHERE word = ?
         GROUP BY user_id ORDER BY first_at ASC`
      )
      .all(word) as { user_id: string; first_at: string }[];

    for (let i = 0; i < submissions.length; i++) {
      // First 10 get points: 1.0, 0.9, 0.8, ..., 0.1
      if (i < 10) {
        const points = 1.0 - i * 0.1;
        addScore.run(points, now, submissions[i].user_id);
      }
    }
  }

  console.log(`Scored ${scoredWords} novel words. Done.`);
}

main().catch(console.error);
