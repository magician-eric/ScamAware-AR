import { CHARACTER_LANGUAGES, NAME_POOLS, resolveFormalMaleName } from './names';
import { ROLES } from './roles';
import { VISUALS, getVisual, CHARACTER_MEDIA_LANGUAGES } from './visuals';

const pick = (items, rng) => items[Math.floor(rng() * items.length)];

export function resolveCast(scenarioId, roleRequests, { rng = Math.random } = {}) {
  // Fail before drawing anything when interchangeable random slots outnumber
  // their shared pool. In particular, scenario01 must never recover from an
  // undersized female pool by assigning the same face to its assistant and a
  // VIP member.
  const randomRequests = roleRequests.map((request) => ({ ...ROLES[request.roleId], ...request, roleId: request.roleId }))
    .filter((rule) => rule.visualStrategy === 'random');
  const groups = randomRequests.reduce((result, rule) => {
    const key = `${rule.gender ?? 'any'}:${rule.nameStyle ?? 'any'}`;
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(rule);
    return result;
  }, new Map());
  for (const [group, requests] of groups) {
    const eligible = VISUALS.filter((visual) => visual.randomEligible
      && requests.some((rule) => (!rule.gender || visual.gender === rule.gender) && visual.eligibleRoles?.includes(rule.roleId)));
    if (eligible.length < requests.length) {
      throw new Error(`Insufficient ${scenarioId} ${group} visual pool: requires ${requests.length}, available ${eligible.length}, shortfall ${requests.length - eligible.length}`);
    }
  }
  const usedVisuals = new Set();
  const usedNames = Object.fromEntries(CHARACTER_LANGUAGES.map((lang) => [lang, new Set()]));
  const roles = {};
  for (const request of roleRequests) {
    const rule = { ...ROLES[request.roleId], ...request };
    if (!ROLES[request.roleId]) throw new Error(`Unknown role ${request.roleId}`);
    if (rule.scenarioScope && !rule.scenarioScope.includes(scenarioId)) throw new Error(`${request.roleId} is not eligible for ${scenarioId}`);
    let visual = rule.visualId ? getVisual(rule.visualId) : null;
    if (rule.visualId && !visual) throw new Error(`Unknown visual ${rule.visualId} for ${request.roleId}`);
    if (visual?.scenarioScope && !visual.scenarioScope.includes(scenarioId)) throw new Error(`${visual.id} is not eligible for ${scenarioId}`);
    if (visual?.eligibleRoles && !visual.eligibleRoles.includes(request.roleId)) throw new Error(`${visual.id} is not eligible for ${request.roleId}`);
    if (rule.visualStrategy === 'random') {
      const eligible = VISUALS.filter((item) => item.randomEligible && (!rule.gender || item.gender === rule.gender) && item.eligibleRoles?.includes(request.roleId) && !usedVisuals.has(item.id));
      if (!eligible.length) throw new Error(`No eligible visual for ${request.roleId}`);
      visual = pick(eligible, rng);
    }
    if (visual && rule.uniqueVisual !== false) usedVisuals.add(visual.id);
    const resolvedNames = rule.fixed ? { ...rule.resolvedNames } : rule.formalNameKind ? resolveFormalMaleName(rule.formalNameKind, rng) : {};
    if (!rule.fixed) {
      if (!rule.formalNameKind) {
        const pool = NAME_POOLS[rule.gender ?? visual?.gender]?.[rule.nameStyle];
        if (!pool) throw new Error(`No name pool for ${request.roleId}`);
        for (const lang of CHARACTER_LANGUAGES) {
          const eligible = pool[lang].filter((name) => !usedNames[lang].has(name));
          if (!eligible.length) throw new Error(`No unique ${lang} name for ${request.roleId}`);
          resolvedNames[lang] = pick(eligible, rng);
        }
      }
    }
    for (const lang of CHARACTER_LANGUAGES) usedNames[lang].add(resolvedNames[lang]);
    roles[request.slotId ?? request.roleId] = { roleId: request.roleId, visualId: visual?.id ?? null, resolvedNames };
  }
  return { version: 1, scenarioId, roles };
}

export function getCastName(cast, slotId, lang = 'zh') {
  return cast?.roles?.[slotId]?.resolvedNames?.[lang] ?? cast?.roles?.[slotId]?.resolvedNames?.zh ?? '';
}

export function validateResolvedCast(cast, { uniqueVisuals = true, uniqueNames = true } = {}) {
  const entries = Object.values(cast?.roles ?? {});
  for (const entry of entries) {
    if (!ROLES[entry.roleId]) throw new Error(`Unknown resolved role ${entry.roleId}`);
    for (const lang of CHARACTER_LANGUAGES) if (!entry.resolvedNames?.[lang]) throw new Error(`${entry.roleId} is missing ${lang} name`);
  }
  if (uniqueVisuals) {
    const ids = entries.map(({ visualId }) => visualId).filter(Boolean);
    if (new Set(ids).size !== ids.length) throw new Error('Resolved cast contains duplicate visuals');
  }
  if (uniqueNames) for (const lang of CHARACTER_LANGUAGES) {
    const names = entries.map(({ resolvedNames }) => resolvedNames[lang]);
    if (new Set(names).size !== names.length) throw new Error(`Resolved cast contains duplicate ${lang} names`);
  }
  return true;
}

// A recorded asset kind is a { zh, en, jp } table of arrays, never a bare
// list - so a bundle cannot go back to holding one language's clips with no
// place to say which language they are (see visuals.js).
const isLocaleTable = (value) => Boolean(value) && !Array.isArray(value)
  && CHARACTER_MEDIA_LANGUAGES.every((lang) => Array.isArray(value[lang]));

export function validateCharacterSystem() {
  const unique = (values) => new Set(values).size === values.length;
  if (!unique(VISUALS.map(({ id }) => id))) throw new Error('Duplicate visual ID');
  if (!unique(Object.keys(ROLES))) throw new Error('Duplicate role ID');
  if ('ja' in CHARACTER_LANGUAGES || CHARACTER_LANGUAGES.includes('ja')) throw new Error('Unsupported ja language key');
  for (const gender of Object.values(NAME_POOLS)) for (const style of Object.values(gender)) for (const lang of CHARACTER_LANGUAGES) if (!style[lang]?.length) throw new Error(`Empty ${lang} name pool`);
  for (const visual of VISUALS.filter(({ fixed }) => fixed)) if (visual.randomEligible) throw new Error(`${visual.id} cannot be random eligible`);
  for (const [roleId, role] of Object.entries(ROLES)) {
    if (!role.visualId) continue;
    const visual = getVisual(role.visualId);
    if (!visual) throw new Error(`${roleId} references unknown visual ${role.visualId}`);
    if (visual.eligibleRoles && !visual.eligibleRoles.includes(roleId)) throw new Error(`${roleId} cannot use ${visual.id}`);
  }
  for (const visual of VISUALS.filter(({ tags }) => tags?.includes('fixed-bundle'))) {
    if (visual.randomEligible || !visual.scenarioScope?.includes('scenario02') || visual.eligibleRoles?.some((roleId) => !['scenario01.investmentAssistant', 'scenario02.datingLead'].includes(roleId) && !roleId.startsWith('scenario02.')) || !visual.assets.avatar || !visual.assets.profilePhoto || !Array.isArray(visual.assets.largePhotos) || !Array.isArray(visual.assets.photos) || !isLocaleTable(visual.assets.videos) || !isLocaleTable(visual.assets.mediaPreviews)) throw new Error(`${visual.id} has incomplete bundle`);
  }
  for (const [roleId, role] of Object.entries(ROLES).filter(([, role]) => role.visualStrategy === 'random')) {
    if (!VISUALS.some((visual) => visual.randomEligible && visual.eligibleRoles?.includes(roleId) && (!role.gender || visual.gender === role.gender))) throw new Error(`${roleId} has no eligible visual`);
    if (!role.formalNameKind && !NAME_POOLS[role.gender ?? 'female']?.[role.nameStyle] && roleId !== 'scenario01.vipMember') throw new Error(`${roleId} has no valid name pool`);
  }
  return true;
}
