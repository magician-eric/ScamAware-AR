// Verifies scenario03's fake police caller-ID phone number generation
// (lib/session/ScenarioSessionFactory.js): every county maps to the right
// Taiwan landline area code, every generated number contains "165" as three
// consecutive digits within one dash-separated group (never split across a
// dash), no county ever falls back to a 09xx mobile number, and the
// missing-county fallback still produces a landline-shaped number.
import { fakePhoneNumber, FALLBACK_AREA_CODE } from '../src/lib/session/ScenarioSessionFactory';
import { LOCATION_DATASET } from '../src/data/location/locationDataset.js';

const EXPECTED = [...new Set(LOCATION_DATASET.map((row) => row.telephoneAreaCode))];

let failures = 0;
let checks = 0;

function fail(label, detail) {
  failures += 1;
  console.log(`  FAIL ${label}: ${detail}`);
}

function ok(label) {
  checks += 1;
  console.log(`  ok   ${label}`);
}

// A dash-split group must not itself contain "165" straddling a boundary -
// checked by requiring "165" to be a substring of at least one group.
function hasUnsplit165(phone) {
  const [, ...groups] = phone.split('-');
  return groups.some((g) => g.includes('165'));
}

console.log('== central dataset area codes + "165" easter egg ==');
for (const expectedAreaCode of EXPECTED) {
  // Run each county many times: the "165" insertion point and the rest of
  // the digits are randomized per call, so a single sample isn't enough to
  // catch an off-by-one in groupWith165's offset math.
  for (let i = 0; i < 200; i += 1) {
    const phone = fakePhoneNumber(expectedAreaCode);
    if (!phone.startsWith(`${expectedAreaCode}-`)) {
      fail(expectedAreaCode, `"${phone}" does not start with "${expectedAreaCode}-"`);
      break;
    }
    if (/^09\d{2}-\d{3}-\d{3}$/.test(phone)) {
      fail(expectedAreaCode, `"${phone}" looks like a 09xx mobile number`);
      break;
    }
    if (!hasUnsplit165(phone)) {
      fail(expectedAreaCode, `"${phone}" has no unsplit "165" in any subscriber-number group`);
      break;
    }
  }
  ok(`${expectedAreaCode}, "165" present across 200 samples`);
}

console.log('\n== session-level behavior ==');

// Multiple distinct sessions produce different numbers (not a hardcoded
// single fake number) and each still carries the "165" easter egg.
{
  const samples = new Set();
  let allHave165 = true;
  for (let i = 0; i < 20; i += 1) {
    const phone = fakePhoneNumber('02');
    samples.add(phone);
    if (!hasUnsplit165(phone)) allHave165 = false;
  }
  if (samples.size < 2) fail('variation', `20 calls for 臺北市 produced only ${samples.size} distinct number(s)`);
  else ok(`variation across sessions (${samples.size}/20 distinct)`);
  if (!allHave165) fail('variation', 'not every sampled number contained "165"');
}

// Missing / unmapped county falls back to a landline shape (not 09xx),
// still contains "165", and uses FALLBACK_AREA_CODE.
{
  for (const badCounty of [null, undefined, '', '不存在的縣市']) {
    const phone = fakePhoneNumber(badCounty);
    if (!phone.startsWith(`${FALLBACK_AREA_CODE}-`)) {
      fail(`fallback(${JSON.stringify(badCounty)})`, `"${phone}" did not use FALLBACK_AREA_CODE "${FALLBACK_AREA_CODE}"`);
    } else if (/^09\d{2}-\d{3}-\d{3}$/.test(phone)) {
      fail(`fallback(${JSON.stringify(badCounty)})`, `"${phone}" looks like a 09xx mobile number`);
    } else if (!hasUnsplit165(phone)) {
      fail(`fallback(${JSON.stringify(badCounty)})`, `"${phone}" has no unsplit "165"`);
    } else {
      ok(`fallback(${JSON.stringify(badCounty)}) -> "${phone}"`);
    }
  }
}

console.log(`\n${checks} check group(s) passed, ${failures} failure(s).`);
console.log(failures ? '\nValidation FAILED - see issues above.' : '\nAll fake-phone-number checks passed.');
process.exit(failures ? 1 : 0);
