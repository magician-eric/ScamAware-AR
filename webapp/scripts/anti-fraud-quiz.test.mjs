// 反詐小測驗 (AntiFraudQuiz) regression suite.
//
// Every scenario run ends on the same shared final-decision step
// (src/components/ui/ScenarioFinalDecision.jsx). This file pins the one
// property that step is now built around: it is a TWO-choice question,
// laid out as a fixed [ LEFT | RIGHT ] pair, with LEFT always the
// safe/correct answer - i.e. correctIndex is 0 in all five scenarios,
// and in all three of Scenario 03's languages.
//
// It reads source text rather than rendering, so it runs under a plain
// `node --test scripts/anti-fraud-quiz.test.mjs` with no JSX loader.
//
// What it deliberately does NOT cover: each scenario's own Outcome /
// 詐騙疑點分析 screens and story dialogue. Those are separate steps with
// their own suites - the quiz is the single shared step after them.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const run = promisify(execFile);
const WEBAPP = new URL('../', import.meta.url).pathname;
const read = (path) => readFile(join(WEBAPP, path), 'utf8');

const QUIZ_COMPONENT = 'src/components/ui/ScenarioFinalDecision.jsx';
const QUIZ_CSS = 'src/components/ui/ScenarioFinalDecision.css';

// The four scenarios whose quiz copy lives inline in their own Quiz.jsx and
// goes through a flat t() lookup. Scenario 03 keys off its own strings
// table instead and is checked separately below.
const SCENARIOS = [
  {
    name: 'Scenario01 (假投資)',
    file: 'src/pages/scenario01/Quiz.jsx',
    left: '停止付款，查詢 165 或向警方求證。',
    right: '先支付保證金，趕快把獲利領出來。',
    removed: '請對方直接從獲利裡面扣款就好。',
  },
  {
    name: 'Scenario02 (假交友)',
    file: 'src/pages/scenario02/Quiz.jsx',
    left: '停止付款、保留紀錄並查詢 165。',
    right: '支付保證金，完成最後一步。',
    removed: '請 {datingLead} 幫忙支付。',
  },
  {
    name: 'Scenario04 (購物詐騙)',
    file: 'src/pages/scenario04/Quiz.jsx',
    left: '保存商品頁、開箱照片與對話紀錄，透過平台正式申請退貨退款。',
    right: '先確認收貨，之後再私下跟賣家協調退款。',
    removed: '直接把商品退回賣家指定的地址，並依對方要求先取消訂單。',
  },
  {
    name: 'Scenario05 (假買家)',
    file: 'src/pages/scenario05/Quiz.jsx',
    left: '停止交易，只依官方平台訂單與實際入帳確認是否出貨。',
    right: '對方已傳付款畫面，先把商品寄出',
    removed: '請買家再傳一張付款截圖確認',
  },
];

// Pulls the `options={[ ... ]}` literal out of a Quiz.jsx and returns the
// t('...') arguments in source order.
function jsxOptions(source) {
  const block = source.match(/options=\{\[([\s\S]*?)\]\}/);
  assert.ok(block, 'no options={[...]} prop found');
  return [...block[1].matchAll(/t\('((?:[^'\\]|\\.)*)'\)/g)].map((m) => m[1]);
}

function jsxCorrectIndex(source) {
  const found = source.match(/correctIndex=\{(\d+)\}/);
  assert.ok(found, 'no correctIndex={N} prop found');
  return Number(found[1]);
}

for (const scenario of SCENARIOS) {
  test(`${scenario.name} asks exactly two choices, LEFT correct / RIGHT incorrect`, async () => {
    const source = await read(scenario.file);
    const options = jsxOptions(source);

    assert.equal(options.length, 2, `${scenario.name} must offer exactly 2 choices`);
    // index 0 = LEFT column = the safe answer; index 1 = RIGHT = the risky one.
    assert.equal(options[0], scenario.left, `${scenario.name} LEFT must be the safe answer`);
    assert.equal(options[1], scenario.right, `${scenario.name} RIGHT must be the risky answer`);
    assert.equal(jsxCorrectIndex(source), 0, `${scenario.name} correct answer must be index 0 (LEFT)`);

    // The dropped third choice must not creep back in.
    assert.ok(!source.includes(scenario.removed),
      `${scenario.name} still offers the removed third choice`);
  });
}

test('Scenario03 (假檢警) keeps the same two choices and correctIndex 0 in zh / en / jp', async () => {
  const source = await read('src/pages/scenario03/i18n.js');
  const blocks = [...source.matchAll(/keyDecision:\s*\{([\s\S]*?)\n {4}\}/g)].map((m) => m[1]);
  assert.equal(blocks.length, 3, 'expected exactly one keyDecision block per language (zh/en/jp)');

  const expected = [
    ['立即停止聯繫，直接撥打 165 或就近向警方查證。',
      '先配合對方指示操作，以免留下案底或被通緝。'],
    ['Stop all contact immediately, and call 165 or verify in person at a police station.',
      'Follow their instructions right away, to avoid a criminal record or a warrant.'],
    ['ただちに連絡を絶ち、165へ電話するか警察署で直接確認する。',
      '前科や指名手配を避けるため、すぐに指示どおり操作する。'],
  ];

  blocks.forEach((block, language) => {
    const list = block.match(/options:\s*\[([\s\S]*?)\]/);
    assert.ok(list, 'keyDecision block has no options array');
    const options = [...list[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
    assert.equal(options.length, 2, 'each language must offer exactly 2 choices');
    assert.deepEqual(options, expected[language], 'LEFT is the safe answer, RIGHT the risky one');
    assert.match(block, /correctIndex:\s*0,/, 'the correct answer must be index 0 (LEFT)');
  });

  // The dropped middle choice ("ask for a document / badge number") is gone
  // in every language, not just Chinese.
  for (const removed of ['要求對方提供公文或警證號碼，核對後再配合。',
    'Ask for an official document or a badge number, and comply once it checks out.',
    '公文書や警察証の番号を提示してもらい、確認できたら協力する。']) {
    assert.ok(!source.includes(removed), `Scenario03 still offers the removed choice: ${removed}`);
  }
});

test('all five scenarios route their quiz through the one shared component', async () => {
  for (const file of [...SCENARIOS.map((s) => s.file), 'src/pages/scenario03/Quiz.jsx']) {
    const source = await read(file);
    assert.match(source, /ScenarioFinalDecision/, `${file} must render the shared quiz`);
  }
  // Scenario03 passes its own strings table through rather than inline copy.
  const scenario03 = await read('src/pages/scenario03/Quiz.jsx');
  assert.match(scenario03, /correctIndex=\{k\.correctIndex\}/);
  assert.match(scenario03, /options=\{k\.options\}/);
});

test('the shared quiz locks in one answer and then shows feedback + explanation', async () => {
  const source = await read(QUIZ_COMPONENT);
  // Lock-in: a second tap after the first is a no-op, and the buttons go
  // disabled once an answer is recorded.
  assert.match(source, /if \(selected !== null\) return;/, 'answering twice must be a no-op');
  assert.match(source, /disabled=\{selected !== null\}/, 'options must lock after the first answer');
  // correct / incorrect feedback, then the explanation, in the same panel.
  assert.match(source, /selected === correctIndex \? t\('✅ 判斷正確'\) : t\('❌ 判斷錯誤'\)/);
  assert.match(source, /\{explanation\}/, 'the explanation must render after answering');
  assert.match(source, /t\('反詐小測驗'\)/, 'the 反詐小測驗 title must stay');
  // One primary action, back to the AR scan.
  assert.match(source, /backTo = '\/ar-scan'/);
  assert.match(source, /<Button to=\{backTo\}/);
});

test('the shared quiz renders two options in a fixed two-column layout', async () => {
  const jsx = await read(QUIZ_COMPONENT);
  const css = await read(QUIZ_CSS);
  assert.match(jsx, /className="btns antifraud-quiz-choices"/,
    'the option row must carry the two-column class');
  assert.match(css, /\.antifraud-quiz-choices\{[^}]*grid-template-columns:1fr 1fr/,
    'the two choices must sit in two equal columns');
  // 320px-430px portrait must never restack the pair into rows, so this
  // stylesheet carries no breakpoint at all.
  assert.ok(!css.includes('@media'),
    'ScenarioFinalDecision.css must not add a breakpoint that restacks the two choices');
});

test('the shared quiz stays a single step: no score, progress, menu or gesture surface', async () => {
  // Comments are stripped first: the component's header explains what this
  // step replaced (the old per-scenario score/result screens), and naming
  // the thing that is gone is not the same as rendering it.
  const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const jsx = stripComments(await read(QUIZ_COMPONENT));
  const css = stripComments(await read(QUIZ_CSS));
  for (const banned of ['score', 'Score', 'progress', 'Progress', 'data-gesture', 'gesture',
    '完整分析', '返回情境']) {
    assert.ok(!jsx.includes(banned), `the shared quiz must not reintroduce ${banned}`);
  }
  assert.ok(!css.includes('data-gesture'), 'the quiz stylesheet must not target gesture hooks');
  // Exactly one navigation target out of the quiz.
  assert.equal((jsx.match(/<Button /g) ?? []).length, 1, 'the quiz has exactly one action button');
});

// --- 反詐小測驗 ownership -----------------------------------------------------
//
// Everything above pins what the quiz *asks*. This section pins who is allowed
// to build it.
//
// The Outcome and 詐騙疑點分析 screens have had a hard ownership guard since
// spec §4.3 (scripts/validate-outcome-ownership.mjs). The step after them did
// not: the five pages/scenarioNN/Quiz.jsx wrappers are clean today - they pass
// a question, two options, a correctIndex and an explanation, and render
// ScenarioFinalDecision with nothing around it - but nothing rejected a
// wrapper that grew a PhoneShell, a stage class, its own option buttons, a
// second CTA, its own answer lock-in, its own AR Interaction Contract, or a
// scenario stylesheet redeclaring `.quiz-option`. Rules I and J of that
// validator are that guard, and these tests are what prove the guard actually
// catches each of those regressions rather than merely being written down.
//
// They drive the real validator against the real tree, applying one regression
// at a time and restoring every touched file afterwards - the same approach as
// scripts/global-css-ownership.test.mjs. Each JSX regression is applied to all
// five wrappers, because "Scenario 01 is guarded" is not the property being
// claimed; "all five are guarded" is.
//
// Note what is deliberately NOT rejected below: a wrapper changing its own
// question, options, correctIndex, explanation or backTo. This section claims
// UI, interaction and CSS ownership only - the quiz copy stays each scenario's.

const QUIZ_PAGES = [
  'src/pages/scenario01/Quiz.jsx',
  'src/pages/scenario02/Quiz.jsx',
  'src/pages/scenario03/Quiz.jsx',
  'src/pages/scenario04/Quiz.jsx',
  'src/pages/scenario05/Quiz.jsx',
];
const GLOBAL_CSS = 'src/styles/global.css';
const SCENARIO_CSS = ['src/styles/scenario01.css', 'src/styles/scenario02.css', 'src/styles/scenario03.css'];

async function runValidator() {
  try {
    const { stdout, stderr } = await run('node', ['scripts/validate-outcome-ownership.mjs'], { cwd: WEBAPP });
    return { code: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return { code: error.code ?? 1, output: `${error.stdout ?? ''}${error.stderr ?? ''}` };
  }
}

// Applies one regression to the tree, runs the real validator, then puts every
// touched file back exactly as it was - whatever the assertions do.
//
//   edits    path -> (previous contents) => next contents
//   creates  path -> contents for a file that did not exist
async function withRegression(edits, assertions, creates = {}) {
  const originals = new Map();
  const created = [];
  try {
    for (const [path, rewrite] of Object.entries(edits)) {
      const before = await read(path);
      originals.set(path, before);
      await writeFile(join(WEBAPP, path), rewrite(before), 'utf8');
    }
    for (const [path, contents] of Object.entries(creates)) {
      await writeFile(join(WEBAPP, path), contents, 'utf8');
      created.push(path);
    }
    await assertions(await runValidator());
  } finally {
    for (const [path, before] of originals) await writeFile(join(WEBAPP, path), before, 'utf8');
    for (const path of created) await rm(join(WEBAPP, path), { force: true });
  }
}

// The three shapes a wrapper regression takes, written against the shape all
// five wrappers share: an import block, a `Quiz()` body, and a return that is
// one self-closing <ScenarioFinalDecision .../>.
const RENDER_OPEN = '    <ScenarioFinalDecision';
const RENDER_CLOSE = '    />\n  );';

// Wraps the shared quiz in something - a frame, a scenario-styled div, a
// fragment with a second child.
const wrappedIn = (open, close, importLine = '') => (source) => {
  assert.ok(source.includes(RENDER_OPEN) && source.includes(RENDER_CLOSE), 'the wrapper no longer has the shape this fixture edits');
  const wrapped = source
    .replace(RENDER_OPEN, `    ${open}<ScenarioFinalDecision`)
    .replace(RENDER_CLOSE, `    />${close}\n  );`);
  return importLine ? `${importLine}\n${wrapped}` : wrapped;
};

// Runs a statement inside Quiz(), i.e. gives the wrapper behaviour of its own.
const calling = (statement, importLine = '') => (source) => {
  const body = source.indexOf('export function Quiz() {');
  assert.ok(body > -1, 'the wrapper no longer declares export function Quiz()');
  const at = body + 'export function Quiz() {'.length;
  const next = `${source.slice(0, at)}\n  ${statement}${source.slice(at)}`;
  return importLine ? `${importLine}\n${next}` : next;
};

// Passes an extra prop to the shared component.
const passing = (prop) => (source) => {
  assert.ok(source.includes(RENDER_OPEN), 'the wrapper no longer renders <ScenarioFinalDecision');
  return source.replace(RENDER_OPEN, `${RENDER_OPEN}\n      ${prop}`);
};

const declaring = (rule) => (css) => `${css}\n${rule}\n`;

test('ownership 0. all five wrappers pass the ownership guard as committed', async () => {
  const { code, output } = await runValidator();
  assert.equal(code, 0, output);
  assert.match(output, /5 quiz pages/, 'the guard must be reading all five Quiz.jsx wrappers');
  assert.match(output, /7 shared quiz classes/, 'the guard must be reading the shared quiz class namespace');
});

// --- the wrapper may not grow a shell ----------------------------------------

test('ownership 1. a wrapper that wraps the quiz in a PhoneShell fails', async (t) => {
  for (const page of QUIZ_PAGES) {
    await t.test(page, async () => {
      await withRegression(
        { [page]: wrappedIn('<PhoneShell>', '</PhoneShell>', "import { PhoneShell } from '../scenario03/components/PhoneShell';") },
        ({ code, output }) => {
          assert.equal(code, 1, 'a scenario shell around the quiz must fail the build');
          assert.match(output, /imports PhoneShell/);
          assert.match(output, /renders <PhoneShell>/);
        },
      );
    });
  }
});

test('ownership 1b. the same holds for every other simulation frame, and for an App module component', async (t) => {
  const page = 'src/pages/scenario01/Quiz.jsx';
  for (const [frame, specifier] of [
    ['PoliceFrame', '../scenario03/components/PoliceFrame'],
    ['BrowserChrome', '../../components/ui/BrowserChrome'],
    ['CibarResultBar', '../../apps/mydondon/components/CibarResultBar'],
    ['AppShell', '../../apps/blackpi/components/AppShell'],
  ]) {
    await t.test(frame, async () => {
      await withRegression(
        { [page]: wrappedIn(`<${frame}>`, `</${frame}>`, `import { ${frame} } from '${specifier}';`) },
        ({ code, output }) => {
          assert.equal(code, 1, `${frame} around the quiz must fail the build`);
          assert.match(output, new RegExp(`renders <${frame}>`));
        },
      );
    });
  }
});

test('ownership 2. a wrapper that sets a stage class fails', async (t) => {
  for (const page of QUIZ_PAGES) {
    await t.test(page, async () => {
      await withRegression(
        {
          [page]: calling(
            "useStageClassName('scenario-quiz-stage');",
            "import { useStageClassName } from '../../shell/StageClassContext';",
          ),
        },
        ({ code, output }) => {
          assert.equal(code, 1, 'painting an App world onto the quiz must fail the build');
          assert.match(output, /uses useStageClassName/);
        },
      );
    });
  }
});

// --- the wrapper may not dress the quiz --------------------------------------

test('ownership 3. a wrapper that adds a scenario-specific className fails', async (t) => {
  for (const page of QUIZ_PAGES) {
    await t.test(page, async () => {
      await withRegression(
        { [page]: wrappedIn('<div className="scenario-quiz-frame">', '</div>') },
        ({ code, output }) => {
          assert.equal(code, 1, 'a scenario-dressed wrapper around the quiz must fail the build');
          assert.match(output, /sets a className/);
          assert.match(output, /renders <div>/);
        },
      );
    });
  }
});

test('ownership 3b. a wrapper may not pass a class hook or a theme to the shared component either', async (t) => {
  const page = 'src/pages/scenario01/Quiz.jsx';
  for (const prop of ['className="scenario-quiz"', 'classPrefix="s01"', "theme={{ card: '#fff' }}", 'onAnswer={() => {}}']) {
    await t.test(prop, async () => {
      await withRegression(
        { [page]: passing(prop) },
        ({ code, output }) => {
          assert.equal(code, 1, `passing ${prop} must fail the build`);
          assert.match(output, /to the 反詐小測驗 - a Quiz wrapper supplies/);
        },
      );
    });
  }
});

test('ownership 3c. a wrapper may not import a stylesheet of its own', async () => {
  await withRegression(
    { 'src/pages/scenario01/Quiz.jsx': (source) => `import '../../styles/scenario01.css';\n${source}` },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /imports the stylesheet/);
    },
  );
});

// --- the wrapper may not build a second quiz UI -------------------------------

test('ownership 4. a wrapper that renders its own option buttons fails', async (t) => {
  for (const page of QUIZ_PAGES) {
    await t.test(page, async () => {
      await withRegression(
        {
          [page]: wrappedIn(
            '<><button type="button" className="quiz-option">A</button><button type="button" className="quiz-option">B</button>',
            '</>',
          ),
        },
        ({ code, output }) => {
          assert.equal(code, 1, 'a wrapper rendering its own options must fail the build');
          assert.match(output, /renders <button>/);
          assert.match(output, /fragment/);
        },
      );
    });
  }
});

test('ownership 4b. a wrapper that adds a second CTA fails', async () => {
  await withRegression(
    {
      'src/pages/scenario01/Quiz.jsx': wrappedIn(
        '<><Link to="/scenario-menu">back</Link>',
        '</>',
        "import { Link } from 'react-router-dom';",
      ),
    },
    ({ code, output }) => {
      assert.equal(code, 1, 'a second way off the quiz screen must fail the build');
      assert.match(output, /renders <Link>/);
    },
  );
});

test('ownership 4c. a whole second quiz UI, anywhere in the tree, fails', async (t) => {
  // Two shapes: one that reuses the shared component (a sixth consumer) and
  // one that reimplements its markup from scratch (borrowing the classes).
  await t.test('a sixth consumer of the shared component', async () => {
    await withRegression({}, ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /the set of pages rendering ScenarioFinalDecision changed/);
      assert.match(output, /imports the shared 反詐小測驗/);
    }, {
      'src/pages/scenario01/QuizAlt.jsx': "import { ScenarioFinalDecision } from '../../components/ui/ScenarioFinalDecision';\n"
        + 'export function QuizAlt() {\n  return (\n    <ScenarioFinalDecision\n      t={(zh) => zh}\n'
        + "      question={'q'}\n      options={['a', 'b']}\n      correctIndex={0}\n      explanation={'e'}\n    />\n  );\n}\n",
    });
  });
  await t.test('a reimplementation borrowing the quiz markup', async () => {
    await withRegression({}, ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /names "antifraud-quiz-card"/);
      assert.match(output, /names "quiz-option"/);
    }, {
      'src/pages/scenario01/QuizAlt.jsx': 'export function QuizAlt() {\n  return (\n'
        + '    <div className="antifraud-quiz-card">\n      <button type="button" className="quiz-option">A</button>\n'
        + '    </div>\n  );\n}\n',
    });
  });
});

// --- the wrapper may not own the interaction ---------------------------------

test('ownership 5. a wrapper that re-implements the answer lock-in fails', async (t) => {
  for (const [what, statement, importLine] of [
    ['React state', 'const [picked, setPicked] = useState(null);', "import { useState } from 'react';"],
    ['a reducer', 'const [picked, dispatch] = useReducer((a, b) => b, null);', "import { useReducer } from 'react';"],
    ['a ref', 'const locked = useRef(false);', "import { useRef } from 'react';"],
  ]) {
    await t.test(what, async () => {
      await withRegression(
        { 'src/pages/scenario01/Quiz.jsx': calling(statement, importLine) },
        ({ code, output }) => {
          assert.equal(code, 1, `a second lock-in built on ${what} must fail the build`);
          assert.match(output, /owns this screen's shell, its one route out, its answer lock-in and its AR Interaction Contract/);
        },
      );
    });
  }
});

test('ownership 6. a wrapper that declares its own AR Interaction Contract fails', async (t) => {
  for (const page of QUIZ_PAGES) {
    await t.test(page, async () => {
      await withRegression(
        {
          [page]: calling(
            "useARInteraction({ mode: 'dual', surfaceId: 'scenario/quiz', left: () => {}, right: () => {} });",
            "import { useARInteraction } from '../../lib/arInteraction';",
          ),
        },
        ({ code, output }) => {
          assert.equal(code, 1, 'a second contract for one screen must fail the build');
          assert.match(output, /uses useARInteraction/);
          assert.match(output, /uses surfaceId/);
        },
      );
    });
  }
});

test('ownership 6b. a wrapper may not navigate off the quiz itself', async () => {
  await withRegression(
    {
      'src/pages/scenario01/Quiz.jsx': calling(
        'const navigate = useNavigate();',
        "import { useNavigate } from 'react-router-dom';",
      ),
    },
    ({ code, output }) => {
      assert.equal(code, 1);
      assert.match(output, /uses useNavigate/);
    },
  );
});

// --- the shared quiz CSS namespace has one owner ------------------------------

test('ownership 7. a scenario stylesheet may not declare the shared quiz classes', async (t) => {
  const RULES = [
    ['.antifraud-quiz-*', '.antifraud-quiz-card{background:#000}', /declares \.antifraud-quiz-card/],
    ['.antifraud-quiz-* (nested in a media query)', '@media (max-width:400px){.antifraud-quiz-choices{grid-template-columns:1fr}}', /declares \.antifraud-quiz-choices/],
    ['.quiz-option', '.quiz-option{color:#f00}', /declares \.quiz-option/],
    ['.quiz-option (as an override)', '.scenario-stage .quiz-option{background:#fff!important}', /declares \.quiz-option/],
    ['.quiz-explain', '.quiz-explain{border:0}', /declares \.quiz-explain/],
  ];
  for (const [what, rule, message] of RULES) {
    for (const stylesheet of SCENARIO_CSS) {
      await t.test(`${what} in ${stylesheet}`, async () => {
        await withRegression(
          { [stylesheet]: declaring(rule) },
          ({ code, output }) => {
            assert.equal(code, 1, `a scenario stylesheet declaring ${what} must fail the build`);
            assert.match(output, message);
            assert.match(output, /components\/ui\/ScenarioFinalDecision\.css/, 'the message must name the owner');
          },
        );
      });
    }
  }
});

test('ownership 7b. global.css may not take the shared quiz classes back either', async (t) => {
  // This is where `.quiz-option` and `.quiz-explain` used to live. The move
  // into the component's own stylesheet is the thing being made permanent.
  for (const rule of ['.quiz-option{color:#f00}', '.quiz-explain{color:#f00}', '.antifraud-quiz-shell{background:#000}']) {
    await t.test(rule, async () => {
      await withRegression(
        { [GLOBAL_CSS]: declaring(rule) },
        ({ code, output }) => {
          assert.equal(code, 1);
          assert.match(output, /which the 反詐小測驗 owns/);
        },
      );
    });
  }
});

test('ownership 7c. the owner keeps its own stylesheet, and losing it fails', async () => {
  const css = await read(QUIZ_CSS);
  for (const name of ['.quiz-option', '.quiz-explain', '.antifraud-quiz-shell', '.antifraud-quiz-card']) {
    assert.ok(css.includes(name), `${QUIZ_CSS} must declare ${name}`);
  }
  await withRegression(
    { [QUIZ_COMPONENT]: (source) => source.replace("import './ScenarioFinalDecision.css';", '') },
    ({ code, output }) => {
      assert.equal(code, 1, 'the shared quiz must import its own stylesheet');
      assert.match(output, /does not import its own stylesheet/);
    },
  );
});

// --- and the guard stays off what a wrapper legitimately owns -----------------

test('ownership 8. a wrapper still owns its own question, answers and back route', async (t) => {
  // The point of the guard is UI/interaction/CSS ownership. If any of these
  // started failing, it would have overreached into the copy - which is the
  // scenario's, not the shared component's.
  const page = 'src/pages/scenario01/Quiz.jsx';
  const CHANGES = [
    ['a rewritten question', (source) => source.replace(/question=\{t\('[^']*'\)\}/, "question={t('換一個問法？')}")],
    ['rewritten options', (source) => source.replace(/options=\{\[[\s\S]*?\]\}/, "options={[t('安全的做法'), t('危險的做法')]}")],
    ['a rewritten explanation', (source) => source.replace(/explanation=\{t\('[^']*'\)\}/, "explanation={t('換一段說明。')}")],
    ['an explicit backTo', passing("backTo={'/ar-scan'}")],
    ['a local question table', calling("const question = t('題目');", '')],
  ];
  for (const [what, rewrite] of CHANGES) {
    await t.test(what, async () => {
      await withRegression({ [page]: rewrite }, ({ code, output }) => {
        assert.equal(code, 0, `${what} is the scenario's own content and must still pass:\n${output}`);
      });
    });
  }
});

test('ownership 8b. the CSS rule is bounded - it does not swallow neighbouring names', async () => {
  // `.quiz-option` is owned; a scenario class that merely has "quiz" in its
  // name is not, or the rule would be a land grab on the word itself.
  await withRegression(
    { 'src/styles/scenario01.css': declaring('.s01-quiz-intro{color:#fff}\n.scenario-quiz-note{color:#fff}') },
    ({ code, output }) => assert.equal(code, 0, output),
  );
});
