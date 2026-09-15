// Verifies Scenario03's fake case-number format and the fixed 22-county
// three-letter code mapping (lib/session/ScenarioSessionFactory.js).
// Format: 三碼縣市簡碼 + CIB + YYYYMMDD + 165 + 既有亂數, all uppercase,
// e.g. "HSZCIB20260819165XXXX". fakeCaseNumber() is the ONLY generator -
// every screen reads session.caseNumber instead of re-deriving one.
import assert from 'node:assert/strict';
import test from 'node:test';
import { COUNTY_CODES, fakeCaseNumber } from '../src/lib/session/ScenarioSessionFactory.js';

const EXPECTED_CODES = {
  臺北市: 'TPE',
  新北市: 'NWT',
  桃園市: 'TAO',
  臺中市: 'TXG',
  臺南市: 'TNN',
  高雄市: 'KHH',
  基隆市: 'KEE',
  新竹市: 'HSZ',
  新竹縣: 'HSQ',
  苗栗縣: 'MIA',
  彰化縣: 'CHA',
  南投縣: 'NAN',
  雲林縣: 'YUN',
  嘉義市: 'CYI',
  嘉義縣: 'CYQ',
  屏東縣: 'PIF',
  宜蘭縣: 'ILA',
  花蓮縣: 'HUA',
  臺東縣: 'TTT',
  澎湖縣: 'PEN',
  金門縣: 'KIN',
  連江縣: 'LIE',
};

const CASE_NUMBER_RE = /^[A-Z]{3}CIB[0-9]{8}165[A-Z0-9]+$/;

test('all 22 counties map to their fixed three-letter code, exactly', () => {
  assert.equal(Object.keys(COUNTY_CODES).length, 22);
  for (const [county, code] of Object.entries(EXPECTED_CODES)) {
    assert.equal(COUNTY_CODES[county], code, `${county} should map to ${code}`);
  }
});

test('no two of the 22 three-letter codes collide', () => {
  const codes = Object.values(COUNTY_CODES);
  assert.equal(new Set(codes).size, codes.length, `duplicate codes found: ${codes.join(',')}`);
});

test('fakeCaseNumber() matches the fixed format for every county, and starts with the right code', () => {
  for (const [county, code] of Object.entries(EXPECTED_CODES)) {
    const caseNumber = fakeCaseNumber(county);
    assert.match(caseNumber, CASE_NUMBER_RE, `${county} -> ${caseNumber}`);
    assert.ok(caseNumber.startsWith(`${code}CIB`), `${county} case number ${caseNumber} should start with ${code}CIB`);
  }
});

test('新竹市/新竹縣, 嘉義市/嘉義縣, and 新北市/南投縣 are distinct three-letter codes (the old two-letter collisions are gone)', () => {
  assert.equal(COUNTY_CODES.新竹市, 'HSZ');
  assert.equal(COUNTY_CODES.新竹縣, 'HSQ');
  assert.notEqual(COUNTY_CODES.新竹市, COUNTY_CODES.新竹縣);
  assert.equal(COUNTY_CODES.嘉義市, 'CYI');
  assert.equal(COUNTY_CODES.嘉義縣, 'CYQ');
  assert.notEqual(COUNTY_CODES.嘉義市, COUNTY_CODES.嘉義縣);
  assert.equal(COUNTY_CODES.新北市, 'NWT');
  assert.equal(COUNTY_CODES.南投縣, 'NAN');
  assert.notEqual(COUNTY_CODES.新北市, COUNTY_CODES.南投縣);
});

test('an unlisted county falls back to the generic SIM code and still matches the format', () => {
  const caseNumber = fakeCaseNumber('不存在的縣市');
  assert.match(caseNumber, CASE_NUMBER_RE);
  assert.ok(caseNumber.startsWith('SIMCIB'));
});
