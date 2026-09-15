export const ROLES = {
  'scenario01.coachChen': { fixed: true, scenarioScope: ['scenario01'], randomEligible: false, visualId: 'scenario01_coach_chen', resolvedNames: { zh: '陳老師', en: 'Coach Chen', jp: 'チェン先生' } },
  'scenario01.stockRookie': { fixed: true, scenarioScope: ['scenario01'], randomEligible: false, visualId: 'scenario01_stock_rookie', resolvedNames: { zh: '股海小白', en: 'Stock Market Rookie', jp: '株初心者' } },
  'scenario01.wealthFreedom': { fixed: true, scenarioScope: ['scenario01'], randomEligible: false, visualId: 'scenario01_wealth_freedom', resolvedNames: { zh: '財富自由ing', en: 'Chasing Financial Freedom', jp: '経済的自由へ' } },
  'scenario01.investmentAssistant': { gender: 'female', nameStyle: 'casual', visualId: 'dating_visual_03', scenarioScope: ['scenario01'], visualStrategy: 'fixed', nameStrategy: 'random' },
  'scenario01.vipMember': { nameStyle: 'casual', visualStrategy: 'random' },
  'scenario02.datingCandidate01': { gender: 'female', nameStyle: 'cute', visualId: 'dating_visual_01', visualStrategy: 'fixed', nameStrategy: 'random' },
  'scenario02.datingCandidate02': { gender: 'female', nameStyle: 'cute', visualId: 'dating_visual_02', visualStrategy: 'fixed', nameStrategy: 'random' },
  'scenario02.datingLead': { gender: 'female', nameStyle: 'cute', visualId: 'dating_visual_03', visualStrategy: 'fixed', nameStrategy: 'random' },
  'scenario03.fakePolice': { gender: 'male', nameStyle: 'formal', formalNameKind: 'officer', scenarioScope: ['scenario03'], visualStrategy: 'random' },
  // The fake 承辦檢察官 is cast the same way the fake 承辦員警 is: one draw per
  // run, for a name AND a face together. He was name-only (`visualStrategy:
  // 'none'`) while he existed solely as a voice on a phone call, but he is
  // shown as a person on three surfaces now - his ring screen, his in-call
  // screen, and his LINE account in the post-transfer aftermath - and all
  // three have to be the same man. Casting him here is what guarantees that:
  // ScenarioSessionFactory resolves both scenario03 roles in ONE resolveCast
  // call, so the officer's visual is already in `usedVisuals` when the
  // prosecutor draws and the two can never come back with the same face.
  'scenario03.fakeProsecutor': { gender: 'male', nameStyle: 'formal', formalNameKind: 'prosecutor', scenarioScope: ['scenario03'], visualStrategy: 'random' },
  // 黑皮安心專員 - the human specialist the platform bot hands over to. Named
  // AND cast from the shared female pool like any other actor, in one draw:
  // she is a named person the player is talking to, so the chat header shows
  // her face and her name, never a role initial.
  'scenario04.platformAgent': { gender: 'female', nameStyle: 'casual', scenarioScope: ['scenario04'], visualStrategy: 'random' },
  // Scenario05's marketplace buyer is no longer a generic random pool: which
  // fixed persona is cast depends on which product the player listed (see
  // lib/scenario05Store.js), and for the stroller line specifically, on a
  // one-time coin flip between the two parent personas below. Every persona
  // is fully fixed (name + visual), the same way scenario01's coachChen is.
  'scenario05.buyerStrollerMom': { fixed: true, scenarioScope: ['scenario05'], randomEligible: false, visualId: 'female_visual_02', resolvedNames: { zh: '佳穎', en: 'Michelle', jp: 'まなみ' } },
  'scenario05.buyerStrollerDad': { fixed: true, scenarioScope: ['scenario05'], randomEligible: false, visualId: 'male_visual_02', resolvedNames: { zh: '哲維', en: 'Marcus', jp: 'たかし' } },
  'scenario05.buyerTablet': { fixed: true, scenarioScope: ['scenario05'], randomEligible: false, visualId: 'female_visual_01', resolvedNames: { zh: '思妤', en: 'Vivian', jp: 'さやか' } },
  // The player's own seller identity, pre-filled on the fake external
  // trading site's sender-info field (never asked of the player - spec
  // requires no real personal data). Gender is drawn per run by the caller
  // (see lib/scenario05Store.js) so both male and female names are equally
  // possible; nameStyle/visualStrategy stay fixed here like every other
  // name-only role.
  'scenario05.sellerSender': { nameStyle: 'casual', visualStrategy: 'none' },
};
