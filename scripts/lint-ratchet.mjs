/**
 * Lint, and hold the line on the existing debt.
 *
 * Run: node scripts/lint-ratchet.mjs <dir>
 *
 * The workflow used to run `npm run lint || echo "Linting failed"`, which
 * exits 0 whatever happens. Replacing that with `continue-on-error: true` was
 * no better -- GitHub records the step's conclusion as "success", so the run
 * still reads green and nothing is attributable. The only honest options are
 * to fail, or to report the real number and refuse to let it grow.
 *
 * Exit codes: 0 the debt is unchanged or lower than recorded, 1 anything
 * else -- including eslint failing to run, which is never a pass.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dir = process.argv[2]
if (!dir) { console.error('usage: node scripts/lint-ratchet.mjs <dir>'); process.exit(1) }

const baselines = JSON.parse(readFileSync(join(root, 'scripts', 'lint-baseline.json'), 'utf8'))
const baseline = baselines[dir]
if (!baseline) { console.error(`no baseline recorded for ${dir}`); process.exit(1) }

const target = resolve(root, dir)
const out = join(target, 'eslint-report.json')
if (existsSync(out)) unlinkSync(out)

spawnSync('npx', ['eslint', '.', '--format', 'json', '-o', out],
          { cwd: target, stdio: ['ignore', 'inherit', 'inherit'], env: process.env })

if (!existsSync(out)) {
  console.error(`\neslint produced no report in ${dir} -- it did not run.`)
  console.error('Reported as a failure: a check that did not run is not a pass.')
  process.exit(1)
}

const files = JSON.parse(readFileSync(out, 'utf8'))
unlinkSync(out)

const errors = files.reduce((n, f) => n + f.errorCount, 0)
const warnings = files.reduce((n, f) => n + f.warningCount, 0)

console.log(`${dir}: ${errors} errors (baseline ${baseline.errors}), ` +
            `${warnings} warnings (baseline ${baseline.warnings})`)

if (errors > baseline.errors || warnings > baseline.warnings) {
  console.error(`\nFAIL — lint debt grew in ${dir}.`)
  for (const f of files) {
    if (f.errorCount || f.warningCount) {
      console.error(`  ${f.errorCount}e ${f.warningCount}w  ${f.filePath.replace(target + '/', '')}`)
    }
  }
  process.exit(1)
}

if (errors < baseline.errors || warnings < baseline.warnings) {
  console.error(`\nFAIL — ${dir} improved: ${baseline.errors}e/${baseline.warnings}w -> ${errors}e/${warnings}w.`)
  console.error(`Lower it in scripts/lint-baseline.json. The ratchet only tightens.`)
  process.exit(1)
}

console.log(`ok — ${dir} lint debt unchanged.`)
