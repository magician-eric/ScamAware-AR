# CIBAR Location Mapping Audit

> Audit date: 2026-08-14. This is a **read/verify/compare/report** artifact only. No production source or runtime dataset was changed. The administrative/agency annex is [`location-mapping/location-mapping-matrix.csv`](location-mapping/location-mapping-matrix.csv), and the provenance-aware police seed register is [`location-mapping/police-precinct-station-seed.csv`](location-mapping/police-precinct-station-seed.csv). Each has 368 records, one for every county/city + township/city/district.

## 0. Executive verdict

| Question | Audit answer |
|---|---|
| 22 county/city administrative data complete? | **Counties yes (22/22); subdivisions no (31/368, 8.4%).** 337 are absent. The JSON expressly calls them a representative sample. |
| Police Department | **22/22 present; 19 exact, 3 names need correction** (苗栗、彰化、雲林). County-level deterministic after a county has been correctly established. |
| Police Precinct | **Production: 0/368 encoded. Audit seed: 12/368 districts (14 Taipei precinct names), all C pending official verification.** `policePrecinct` remains `null`, except the hardcoded default profile. |
| Police Station | **Production: 0/368. Audit seed: 5 信義分局 station memberships, confidence C; 0 GPS service jurisdictions.** CIBAR has neither an inventory nor boundaries. |
| Prosecutors Office | Current county table has 22 values, but is not district-correct. District resolution is possible from official territorial tables. This annex records verified exceptions for 臺北市、新北市、高雄市; a complete production dataset still requires row-by-row sign-off. |
| District Court | Same limitation as prosecutors: 22 county defaults are present but county is not a safe jurisdiction key. |
| Telephone area code | **22/22 county defaults present** and all 13 requested codes appear except **0826**. County-level codes cannot represent 烏坵鄉 (0826). Exchange prefixes are not present and were not inferred. |
| Safe automatic ceiling today | After manual county selection: department and broad area-code default. GPS resolution itself is not boundary-based, so it must not be represented as deterministic. |

## 1. What CIBAR currently contains

### Location core

* `LocationManager.js` only wraps browser geolocation and returns latitude, longitude, and accuracy; it performs no geographic mapping.
* `LocationProfileStore.js` persists a locked profile in IndexedDB plus localStorage/in-memory fallbacks. When setup is skipped, it silently supplies 臺北市信義區, 臺北市政府警察局信義分局, 臺北地檢署, 臺北地院, and 02 as a locked `system-default` profile.
* `RegionAgencyResolver.js` loads four JSON files. GPS is matched to the **nearest county centroid**, then nearest sampled district centroid within 15 km. This is neither point-in-polygon nor reverse geocoding. Agency resolution uses county only; precinct is always null.

### Runtime datasets

| Dataset | Current content | Audit |
|---|---:|---|
| `taiwan-regions.json` | 22 counties, only 31 districts, centroid samples, one area code per county | County list complete; district list 8.4%; geographic resolution non-deterministic. |
| `police-agencies.json` | 22 county → department strings | Complete keys; 3 official-name mismatches. No precinct/station data. |
| `prosecutors-offices.json` | 22 county → office strings | Complete keys but incorrect model where judicial districts split counties/cities. |
| `district-courts.json` | 22 county → court strings | Same structural defect. Its note claiming each county's court and prosecution office share a judicial district is unsafe. |

### Staff Setup and consumers

Staff Setup lists only the 31 sampled districts. GPS and manual selection both call the same county-only agency resolver. The summary displays a manual precinct placeholder, but the setup screen provides **no input control that can actually populate it**. The handoff screen displays department, prosecution, court and area code, not precinct.

Scenario 03 is the location-aware consumer. It copies the locked profile into session storage and uses department/prosecution/court strings in calls, LINE identity, documents, UI, and dialogue. Generic fallbacks (`警察局`, `地方檢察署`, `地方法院`) are repeated across scenario config/dialogue/pages. A separate 22-county area-code map generates fictional caller IDs.

## 2. Administrative-division completeness

The annex contains the complete 368-row checklist and an `Existing in CIBAR` column. Counts are:

| Level | Official audit universe | Existing | Missing | Coverage |
|---|---:|---:|---:|---:|
| County/city | 22 | 22 | 0 | 100% |
| Township/city/district | 368 | 31 | 337 | 8.4% |

Names and the 22/368 baseline are checked against the Ministry of the Interior Department of Land Administration's [administrative division query](https://www.land.moi.gov.tw/chhtml/content/68) and the government's [township/city/district boundary open data](https://data.gov.tw/dataset/7441). A row marked `yes` means only that the name occurs in CIBAR—not that its centroid is an official boundary or that GPS resolution is valid.

## 3. Police mapping audit

### 3.1 Formal police-department names

| County/city | Current CIBAR | Expected official name | Match | Confidence |
|---|---|---|---|---|
| 苗栗縣 | 苗栗縣政府警察局 | 苗栗縣警察局 | **No** | A |
| 彰化縣 | 彰化縣政府警察局 | 彰化縣警察局 | **No** | A |
| 雲林縣 | 雲林縣政府警察局 | 雲林縣警察局 | **No** | A |
| Other 19 | See CSV | Same as current | Yes | A |

These are names, not generated strings. Verification register: National Police Agency [police agency links](https://www.npa.gov.tw/ch/app/artwebsite/view?id=1094&module=artwebsite&serno=8c6c929c-80f3-4e57-9820-4128fca94e93); official sites for [苗栗縣警察局](https://www.mpb.gov.tw/), [彰化縣警察局](https://www.chpb.gov.tw/), and [雲林縣警察局](https://www.ylhpb.gov.tw/). Before production use, retain an official URL and retrieval date per row rather than relying on naming convention.

### 3.2 Precincts

CIBAR production coverage is **0/368**. Following the requested seed-first workflow, `police-precinct-station-seed.csv` now provides all 368 audit keys and seeds Taipei’s 12 districts (14 precinct names). These entries are grade C until an official department/precinct page is recorded in `verifiedSource` with `verifiedAt`; blank cells are explicitly pending rather than guessed. The main matrix deliberately says `unknown — not in CIBAR`; it does not turn district names into precinct names. Precinct service territories are frequently many-to-many: a district can contain multiple precincts, and a precinct may cover multiple administrative districts. Therefore:

* `exact`: permissible only where an official jurisdiction table establishes one precinct for the entire district;
* `multiple`: district identifies a closed set of precincts but not one precinct;
* `ambiguous`: sources conflict or describe organization rather than territorial jurisdiction;
* `needs-coordinate`: subdivision-level boundaries are required within the district.

The only non-null runtime value is the **default** `臺北市政府警察局信義分局`. It is valid for the default's broad district-level identity but is not evidence that district-to-precinct can generally be generated.

#### Seed-index provenance contract

The supplied [中華民國警察分局列表](https://zh.wikipedia.org/zh-tw/中華民國警察分局列表) is recorded only in `seedSource`. It is an index for discovering precinct names, stated jurisdictions, station membership, and official precinct links—not production authority. `verifiedSource` must be an NPA, police department, precinct, or government-open-data URL actually checked; `verifiedAt` is the UTC check date; only then may confidence become A/B. A seed-only row remains C, and a blank/unresolved row remains X.

The new seed register intentionally separates three propositions: (1) district→precinct, (2) station→parent precinct, and (3) coordinate→station service territory. The five 信義 entries supplied for this review seed proposition (2) only. They **do not** establish proposition (3), so the row says `seed-parent-membership` rather than `jurisdiction-confirmed`.

Direct retrieval of Wikipedia and linked official sites was attempted on 2026-08-14, but this execution environment's outbound proxy returned HTTP 403. Therefore no row is falsely stamped as officially verified in this revision: `verifiedSource`/`verifiedAt` remain blank and confidence remains C/X. This is an environment limitation, not a claim that the seed is wrong.

### 3.3 Stations, substations, police posts

CIBAR production has **no station list, parent-precinct table, address coordinates, jurisdiction text, or jurisdiction polygon**. The audit seed register now carries the five user-supplied 信義分局 station memberships at C, while every unseeded row remains X. None is a GPS station-jurisdiction record. This audit intentionally does not present the nearest facility as the competent facility.

A production-quality station annex needs one record per official unit with: formal name, unit type (派出所／分駐所／駐在所／其他), parent precinct, official address, coordinate and its provenance, verbatim/normalized jurisdiction description, effective date, official URL, and one of:

* `jurisdiction-confirmed` — official boundary or explicit territorial statement;
* `address-only` — official facility address only;
* `nearest-candidate` — distance result, explicitly not jurisdiction;
* `unknown` — insufficient evidence.

The National Police Agency's [police station open-data catalog](https://data.gov.tw/dataset/5958) can seed facility identity/address checks, but an address point does **not** prove jurisdiction. Individual department/precinct official jurisdiction pages must supply the missing authority. No record should be promoted to A/B merely because it appears on a map.

## 4. GPS → agency feasibility

| Resolution step | Today | Required for trustworthy automation |
|---|---|---|
| GPS → County | **Nearest-centroid fallback only**; may fail near borders/islands | Official county polygons + point-in-polygon, or authoritative reverse geocoder. |
| GPS → District | **Nearest among only 31 samples**, 15-km heuristic; not deterministic | All 368 district polygons and explicit offshore/border handling. |
| District → Police Department | Deterministic once county is trustworthy | Correct the 3 names; version/source metadata. |
| District → Precinct | No dataset | Official precinct jurisdiction polygons or authoritative district/里/road-range rules. District-only works only for proven one-to-one rows. |
| GPS → Precinct | Not available | Precinct polygons/rules; do not substitute nearest office. |
| GPS → Station | Not available | Station service-territory polygons/rules. |
| GPS → nearest station | Technically possible only after acquiring station coordinates | A clearly labelled convenience fallback; never “正式管轄”. |

**District alone cannot select a station anywhere under the current data model.** Large urban districts with multiple stations and any precinct/station territory divided by 里, road segment, address range, river, or other boundary require coordinates **plus** an authoritative jurisdiction layer; coordinates alone are not sufficient.

## 5. Judicial jurisdiction audit

County-only resolution is wrong in at least these verified groups:

| County/city | Districts | Expected prosecution / court | Current | Match | Confidence |
|---|---|---|---|---|---|
| 臺北市 | 士林、北投 | 臺灣士林地方檢察署 / 臺灣士林地方法院 | 臺北 / 臺北 | No | A |
| 新北市 | 淡水、八里、三芝、石門 | 士林 / 士林 | 新北 / 新北 | No | A |
| 新北市 | 瑞芳、貢寮、平溪、雙溪 | 基隆 / 基隆 | 新北 / 新北 | No | A |
| 新北市 | 新店、深坑、石碇、坪林、烏來 | 臺北 / 臺北 | 新北 / 新北 | No | A |
| 高雄市 | CSV-listed northern/eastern 22 districts | 橋頭 / 橋頭 | 高雄 / 高雄 | No | A; row sign-off required |

The 368-row annex applies these exceptions and preserves current county mappings elsewhere. Authoritative checks: Judicial Yuan [court jurisdiction search](https://www.judicial.gov.tw/tw/lp-144-1.html), [臺灣士林地方法院 jurisdiction](https://sld.judicial.gov.tw/tw/cp-2988-213812-395d4-191.html), [臺灣橋頭地方法院 jurisdiction](https://ctd.judicial.gov.tw/tw/cp-4817-224846-1b383-181.html), and Ministry of Justice [prosecutorial agencies](https://www.moj.gov.tw/2204/2645/2700/). The system can become district-level, but only after the complete table is formally signed off; it cannot be derived from county names.

## 6. Telephone audit

| Code | Region metadata (not exchange-prefix inference) | CIBAR status |
|---|---|---|
| 02 | 臺北、新北、基隆 | Present |
| 03 | 桃園、新竹市、新竹縣、宜蘭、花蓮 share the code; subscriber prefixes distinguish networks/areas | Present |
| 037 | 苗栗 | Present |
| 04 | 臺中、彰化 | Present |
| 049 | 南投 | Present |
| 05 | 雲林、嘉義市、嘉義縣 | Present |
| 06 | 臺南、澎湖 | Present |
| 07 | 高雄 | Present |
| 08 | 屏東 | Present |
| 082 | 金門 (general county default) | Present |
| **0826** | **烏坵** | **Missing; county-only model cannot express it** |
| 0836 | 連江 | Present |
| 089 | 臺東 | Present |

Source: National Communications Commission [public telephone network numbering plan](https://www.ncc.gov.tw/chinese/files/16012/2128_35206_160127_1.pdf). The table describes regional metadata only. CIBAR has no reliable landline exchange-prefix dataset, so none was guessed. `ScenarioSessionFactory` duplicates the county map and subscriber digit-group formats. Both omit 0826, making an 烏坵 fictional number use 082. Shared codes prove that area code does not identify a county, district, police agency, court, or prosecutor.

## 7. Current CIBAR vs expected: defect register

| Field | Current | Expected | Match | Severity |
|---|---|---|---|---|
| Administrative subdivisions | 31 samples | 368 | No | Critical: manual and GPS choices incomplete. |
| GPS county/district | nearest centroids | polygon/reverse-geocoder result | No | Critical: boundary claims unsafe. |
| Police department names | 3 obsolete/nonformal strings | official strings above | No | High. |
| Police precinct | always null; default only | authoritative territory mapping | Missing | High. |
| Police station | no field/data | facility + jurisdiction dataset | Missing | High. |
| Prosecution/court mapping | county-only | district-level territorial mapping | No | Critical in 臺北、新北、高雄 and any further exceptions. |
| Area code | one per county | district/special-region metadata | Partial | High for 烏坵: matrix now marks Current 082 vs Expected 0826 as a mismatch. |
| Exchange prefix | none | sourced table if a use case requires it | Missing | Do not infer. |
| Source/effective date | dataset notes only | per-record URL, retrieval/effective dates | Missing | Governance risk. |
| Confidence/quality | none | A/B/C/D/X and resolution quality | Missing | Prevents safe automation. |

## 8. Hardcoded, generated, fallback and duplicate inventory

The search terms were run across `webapp/src`, `data`, `docs`, and `README.md`; generated bundles/assets and dependencies were excluded.

| Location | Finding | Classification / risk |
|---|---|---|
| `LocationProfileStore.js` | Full locked 臺北市信義區 default, including a precinct, agencies and 02 | Hardcoded fallback can look staff-confirmed. |
| `RegionAgencyResolver.js` | 15-km cutoff, nearest centroids, county-only lookup, precinct null | Heuristic/generated resolution. |
| `taiwan-regions.json` | Approximate county-hall centroids and 31 representative district points | Incomplete location dataset. |
| `police-agencies.json` | 22 hardcoded strings | 3 mismatches; no provenance per value. |
| `prosecutors-offices.json`, `district-courts.json` | 22 hardcoded county maps | Duplicate county-level jurisdiction assumption. |
| `StaffSetupScreen.jsx` | GPS/manual paths both resolve agencies by county | Scenario-independent but loses district jurisdiction. No precinct editor despite UI copy. |
| `StaffLocationSummary.jsx` | Says precinct should be manually entered | No corresponding input exists. |
| `ScenarioSessionFactory.js` | Separate `AREA_CODE_TABLE`, `REGION_PREFIXES`, fallback 02, generated subscriber shapes | Duplicate map; 0826 missing. Numbers are intentionally fictional, not official contacts. |
| `scenario03Config.js` | Repeated department/prosecution/court getters and generic fallbacks | Duplicate consumer fallback. |
| `scenario03Dialogues.js` | Same department/prosecution generic fallbacks; text says “轄區” | May overstate jurisdiction quality. |
| Scenario 03 pages (`CaseSite`, `IncomingCall`, `BankApp`, `ProsecutorCall`, `CallStage1`) | Local reads with `警察局` / `地方檢察署` fallback | Repeated consumer logic. |
| Scenario 01/03 safety copy | “鄰近／就近派出所” | Appropriate proximity wording; must not be treated as a jurisdiction mapping. |

A reproducible full hit list is provided in [`location-mapping/repository-search-inventory.txt`](location-mapping/repository-search-inventory.txt); it includes filenames and line numbers and intentionally contains false-positive review candidates such as ordinary “phone” UI identifiers.

## 9. Data-quality policy

| Grade | Meaning | Automatic production use |
|---|---|---|
| A | Official source directly confirms the record | Allowed, with source/effective-date checks. |
| B | Deterministically derived from official data | Allowed; derivation must be documented/tested. |
| C | Multiple non-authoritative/secondary sources agree | **No; manual review.** |
| D | Estimate/nearest/name-based inference | **No.** |
| X | Insufficient data | **No.** |

Never automate guesses for: precinct/station from a same-name district; competent station from nearest distance; administrative membership from nearest centroid; court/prosecutor from county alone; department name by concatenation; telephone exchange prefix; or legal/police jurisdiction from a facility address.

## 10. Required next data work (not implementation)

1. Obtain/version official 368 district polygons and validate every name/code.
2. Obtain a dated national police-unit inventory; then separately collect official precinct and station jurisdiction rules/polygons. Keep addresses and jurisdiction evidence distinct.
3. Complete formal row-by-row judicial sign-off against each court and prosecution office's current jurisdiction page.
4. Add 0826 at 烏坵 district level and verify subscriber formats against the current NCC numbering plan.
5. Require source URL, retrieved/effective date, confidence, and resolution quality for every mapping. Only A/B enters a future production resolver.

## Reproduction checks

```bash
python - <<'PY'
import csv, json
r=list(csv.DictReader(open('docs/location-mapping/location-mapping-matrix.csv', encoding='utf-8-sig')))
j=json.load(open('data/taiwan-regions.json'))
print(len(j['counties']), sum(len(c['districts']) for c in j['counties']), len(r))
PY
# Expected: 22 31 368
```
