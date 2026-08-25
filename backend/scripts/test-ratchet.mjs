/**
 * Runs the test suite and holds the line on known failures.
 *
 * Replaces `npm test || echo "Tests failed"`, which reported success no matter
 * what the tests did. The suite currently has a large backlog of stale
 * assertions, so failing outright would block every branch; instead the count
 * is pinned and can only move down.
 *
 * Exit codes: 0 the debt is unchanged, 1 anything else -- including the suite
 * failing to run at all, which is never treated as a pass.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = join(root, "tests", "known-failures.json");
const resultsPath = join(root, "jest-results.json");

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

if (existsSync(resultsPath)) unlinkSync(resultsPath);

const run = spawnSync(
  "npx",
  ["jest", "--silent", "--maxWorkers=1", "--json", `--outputFile=${resultsPath}`],
  { cwd: root, stdio: ["ignore", "inherit", "inherit"], env: process.env }
);

// A suite that could not run has proved nothing. It must never look like a pass.
if (!existsSync(resultsPath)) {
  console.error("\njest produced no results file -- the suite did not run.");
  console.error(`(exit ${run.status}${run.error ? `, ${run.error.message}` : ""})`);
  console.error("Reported as a failure: a run that did not happen is not a pass.");
  process.exit(1);
}

const r = JSON.parse(readFileSync(resultsPath, "utf8"));
unlinkSync(resultsPath);

const suites = r.numFailedTestSuites;
const tests = r.numFailedTests;

if (r.numTotalTests === 0) {
  console.error("\njest ran but collected zero tests -- that is a broken config, not a pass.");
  process.exit(1);
}

// The count of FAILING tests is not enough on its own. A suite that stops
// loading contributes zero tests, so its failures vanish and the ratchet reads
// it as an improvement. That happened here: a bad import path took two suites
// out and the totals still looked better. Pin the total as well.
if (r.numTotalTests < baseline.totalTests) {
  console.error(`\nFAIL — only ${r.numTotalTests} tests were collected, expected at least ${baseline.totalTests}.`);
  console.error("A suite has stopped loading. Its failures are not gone, they are hidden.");
  for (const suite of r.testResults) {
    if (suite.status !== "passed" && suite.assertionResults.length === 0) {
      console.error(`  did not load: ${suite.name.split("/backend/").pop()}`);
    }
  }
  process.exit(1);
}

console.log(`\nsuites: ${suites} failing (baseline ${baseline.failedSuites})`);
console.log(`tests : ${tests} failing (baseline ${baseline.failedTests}), ` +
            `${r.numPassedTests} passing of ${r.numTotalTests}`);

if (tests > baseline.failedTests || suites > baseline.failedSuites) {
  console.error("\nFAIL — more tests fail than the recorded baseline.");
  console.error("Something regressed, or a new test was added already broken.");
  for (const suite of r.testResults) {
    const failed = suite.assertionResults.filter(a => a.status === "failed");
    if (failed.length) console.error(`  ${failed.length.toString().padStart(3)} ${suite.name.split("/backend/").pop()}`);
  }
  process.exit(1);
}

if (tests < baseline.failedTests || suites < baseline.failedSuites) {
  console.error(`\nFAIL — the suite improved: ${baseline.failedTests} -> ${tests} failing tests.`);
  console.error(`Lower the numbers in tests/known-failures.json to ${tests} tests / ${suites} suites`);
  console.error("so the ratchet holds the new position. It only tightens.");
  process.exit(1);
}

console.log(baseline.failedTests === 0
  ? `\nok — all ${r.numPassedTests} tests passing, none failing.`
  : "\nok — known failures unchanged. Debt is still debt; nothing got worse.");
