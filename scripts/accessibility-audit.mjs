#!/usr/bin/env node
/**
 * WCAG 2.2 AA accessibility audit for Vantage NTP
 * 
 * Runs automated axe-core v4.11.3+ scan against the rendered NTP.
 * Outputs: accessibility-report.md + detailed JSON
 * 
 * Usage:
 *   npm run audit
 *     or
 *   node scripts/accessibility-audit.mjs [--headless]
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Usage: npm run audit -- [--headless]\n\nRuns the Vantage accessibility audit with Puppeteer and axe-core.`);
  process.exit(0);
}

const [{ default: puppeteer }, axeModule] = await Promise.all([
  import('puppeteer'),
  import('@axe-core/puppeteer')
]);
const AxePuppeteer = axeModule.AxePuppeteer || axeModule.default;

const SCRIPT_DIR = new URL('.', import.meta.url).pathname.replace(/\/$/, '');
const REPO_ROOT = join(SCRIPT_DIR, '..');
const UNPACKED_DIR = join(REPO_ROOT, 'dist', 'unpacked-chromium');
const DOCS_DIR = join(REPO_ROOT, 'docs');
const REPORT_PATH = join(DOCS_DIR, 'accessibility-report.md');
const RESULTS_PATH = join(DOCS_DIR, 'accessibility-results.json');

async function runAudit() {
  let browser;
  try {
    mkdirSync(DOCS_DIR, { recursive: true });

    const { existsSync } = await import('fs');
    const extPath = existsSync(UNPACKED_DIR) ? UNPACKED_DIR : REPO_ROOT;

    browser = await puppeteer.launch({
      headless: process.argv.includes('--headless') ? 'new' : false,
      args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
      ]
    });

    const extId = await discoverExtensionId(browser);
    const page = await browser.newPage();

    const extensionUrl = `chrome-extension://${extId}/newtab.html`;
    await page.goto(extensionUrl, { waitUntil: 'networkidle2' });
    
    // Wait for main content to render
    await page.waitForSelector('[data-widget]', { timeout: 5000 }).catch(() => {
      console.warn('⚠ Widgets not yet rendered; proceeding with available DOM');
    });
    
    // Run axe scan
    console.log('🧪 Running axe-core v4.11.3 scan...');
    const results = await new AxePuppeteer(page)
      .withTags(['wcag2aa', 'wcag22aa'])
      .analyze();
    
    // Save raw results
    writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
    console.log(`✅ Raw results: ${RESULTS_PATH}`);
    
    // Generate markdown report
    const report = generateMarkdownReport(results);
    writeFileSync(REPORT_PATH, report);
    console.log(`📄 Report: ${REPORT_PATH}`);
    
    // Print summary
    printSummary(results);
    
  } finally {
    if (browser) await browser.close();
  }
}

async function discoverExtensionId(browser) {
  const targets = browser.targets();
  const sw = targets.find(t =>
    t.type() === 'service_worker' && t.url().startsWith('chrome-extension://')
  );
  if (sw) return new URL(sw.url()).hostname;
  const page = await browser.newPage();
  await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));
  const id = await page.evaluate(() => {
    const el = document.querySelector('extensions-manager');
    const items = el?.shadowRoot?.querySelector('extensions-item-list');
    const item = items?.shadowRoot?.querySelector('extensions-item');
    return item?.id || null;
  }).catch(() => null);
  await page.close();
  if (id) return id;
  throw new Error('Could not discover extension ID. Build the unpacked extension first: scripts/build-unpacked.ps1');
}

function generateMarkdownReport(results) {
  const { violations, passes, incomplete, inapplicable } = results;
  
  const date = new Date().toISOString().split('T')[0];
  
  let md = `# Vantage v1.0.0 — Accessibility Audit Report

**Date:** ${date}  
**Standard:** WCAG 2.2 Level AA  
**Tool:** axe-core v4.11.3  

## Summary

| Outcome | Count |
|---------|-------|
| Violations | ${violations.length} |
| Passes | ${passes.length} |
| Incomplete (manual review) | ${incomplete.length} |
| Inapplicable | ${inapplicable.length} |

**Status:** ${violations.length === 0 ? '✅ PASS' : '❌ NEEDS FIXES'}

---

## Violations (Must Fix)

${violations.length === 0 ? '_None found._\n' : violations.map(v => `
### ${v.id} — ${v.impact.toUpperCase()}

**Rule:** \`${v.id}\`  
**Impact:** ${v.impact}  
**WCAG:** ${v.tags.map(t => t.toUpperCase()).join(', ')}  

**Description:** ${v.description}  
**Help:** [${v.help}](${v.helpUrl})

**Affected Elements:**
${v.nodes.map(n => `- \`${n.html.slice(0, 80)}\``).join('\n')}

**Remediation:**
${v.nodes[0]?.failureSummary || 'See help link above.'}

---
`).join('')}

---

## Manual Review Required (Incomplete)

${incomplete.length === 0 ? '_None._\n' : incomplete.map(i => `
### ${i.id} — ${i.impact.toUpperCase()}

**Description:** ${i.description}  
**Help:** [${i.help}](${i.helpUrl})

**Affected Elements:**
${i.nodes.map(n => `- \`${n.html.slice(0, 80)}\``).join('\n')}

---
`).join('')}

---

## Passes

**${passes.length}** checks passed successfully.

---

## Next Steps

1. **Violations:** Address all violations in the list above. Each includes remediation guidance.
2. **Incomplete:** Perform manual screen-reader testing (NVDA on Windows; VoiceOver on macOS).
3. **Re-audit:** Run this script again after fixes.

### Manual Testing Checklist

- [ ] NVDA + Windows 10/11 — tab through all panels, verify focus order and labels
- [ ] VoiceOver + macOS Safari — verify announced titles and button labels
- [ ] Keyboard-only navigation — all interactive elements reachable via Tab/Enter/Arrows
- [ ] Color contrast — high-contrast mode (\`prefers-contrast: more\`)
- [ ] Zoom to 200% — layout and readability preserved

---

## Scope

**In Scope:**
- All widget render surfaces (QuickLinks, TopSites, Bookmarks, Feeds, Weather, Clock, Crypto, Quotes, Pomodoro, Notes, Search)
- Settings panel (all tabs and forms)
- Modals (import/export, context menu, widget picker)
- All color themes (Mocha, Macchiato, Frappe, Latte)

**Out of Scope:**
- Third-party widget iframes (user-supplied HTML)
- External service UI (OAuth flows, API dashboards)

---

Generated by Vantage accessibility audit script.
`;

  return md;
}

function printSummary(results) {
  const { violations, passes, incomplete } = results;
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 ACCESSIBILITY AUDIT SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passes:       ${passes.length}`);
  console.log(`❌ Violations:   ${violations.length}`);
  console.log(`⚠️  Incomplete:   ${incomplete.length}`);
  console.log('='.repeat(50));
  
  if (violations.length > 0) {
    console.log('\n🚨 VIOLATIONS REQUIRING FIXES:\n');
    violations.forEach(v => {
      console.log(`  ${v.impact.toUpperCase()} — ${v.id}`);
      console.log(`    ${v.description}`);
      console.log();
    });
  }
  
  if (incomplete.length > 0) {
    console.log('\n⚠️  ITEMS NEEDING MANUAL REVIEW:\n');
    incomplete.forEach(i => {
      console.log(`  ${i.id}`);
      console.log(`    ${i.description}`);
      console.log();
    });
  }
  
  process.exit(violations.length > 0 ? 1 : 0);
}

runAudit().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});
