import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PoliceFrame } from './components/PoliceFrame';
import { Countdown } from './components/Countdown';
import { getOrCreateScenarioSession, getPoliceUnitDisplay, getProsecutorDisplayName, getProsecutorsOfficeDisplay } from '../../lib/session/ScenarioSessionFactory';
import { addWarningFlags, endFirstPoliceCall, getScenario03State, updateScenario03State } from '../../lib/scenario03Store';
import { playSound } from '../../lib/scenario03Feedback';
import { getCaseSiteTasks, buildFakeDocuments } from '../../data/scenario03Config';
import { getScenario03Lang, getScenario03Strings } from './i18n';
import { useARInteraction } from '../../lib/arInteraction';

// Scene 06 - 假案件管理網站. A site that looks like a government service:
// agency masthead, case card, countdown, a four-step checklist that unlocks
// one "official document" at a time. Every document carries a 教育模擬 /
// SIMULATED watermark and a visibly fake serial - no screenshot taken here
// can ever pass as a real judicial document.
//
// Signing the consent form ends the first officer's call and routes straight
// to the prosecutor's own incoming-call screen. There is deliberately no
// centre-screen "檢察官來電確認" preview overlay in between: it covered the
// case site, announced a call before it rang, and said nothing the real ring
// screen (ProsecutorCall.jsx) does not already say. The ring screen IS the
// call announcement.
export function CaseSite() {
  const navigate = useNavigate();
  const initialState = useMemo(() => getScenario03State(), []);
  const [session] = useState(() => getOrCreateScenarioSession());
  const lang = getScenario03Lang();
  const t = getScenario03Strings(lang);
  const documents = useMemo(() => buildFakeDocuments(session, lang), [session, lang]);
  const caseSiteTasks = useMemo(() => getCaseSiteTasks(lang), [lang]);
  const [openIndex, setOpenIndex] = useState(null);
  const [read, setRead] = useState(() => {
    const restored = Array.isArray(initialState.documentsRead) ? initialState.documentsRead : [];
    // consentSigned predates documentsRead in some saved sessions. Preserve
    // completion for those sessions instead of relocking the final task.
    return initialState.consentSigned && !restored.includes('consent')
      ? [...restored, 'consent']
      : restored;
  });
  useEffect(() => {
    if (getScenario03State().firstPoliceCallStatus === 'ended') {
      navigate('/scenario03-police/prosecutor-call', { replace: true });
    }
  }, [navigate]);

  // Unit names come from the run's snapshot only - this screen never
  // resolves or re-draws a division/station of its own.
  const policeUnit = getPoliceUnitDisplay(session, lang);
  const police = policeUnit.department ?? t.common.policeDepartmentFallback;
  const prosecutors = getProsecutorsOfficeDisplay(session, lang) ?? t.common.prosecutorsOfficeFallback;

  function openDoc(index) {
    playSound('pdfOpen');
    setOpenIndex(index);
  }

  // Putting a document down. The three read-only documents are completed by
  // reading them, so closing one ticks its task off.
  //
  // The consent form is the exception, and closing it must NOT tick its task
  // off: 送出同意書 (submitConsent) is the only thing that completes that
  // task, because it is the only thing that signs the consent, ends the
  // officer's call and moves the run on to the prosecutor. Marking it read
  // from here left all four tasks 已完成 on a screen whose only story action
  // is "open the one unlocked task" - activeTaskIndex went to -1, the
  // contract collapsed to `display`, and the run had nothing left that a
  // gesture could reach. The one way on was to re-open the consent form,
  // which no gesture can do.
  function closeDoc() {
    playSound('click');
    const doc = documents[openIndex];
    if (doc) {
      addWarningFlags('opened_fake_documents');
      if (!doc.consent && !read.includes(doc.key)) {
        const next = [...read, doc.key];
        setRead(next);
        updateScenario03State({ documentsRead: next });
      }
    }
    setOpenIndex(null);
  }

  function submitConsent() {
    playSound('click');
    const next = read.includes('consent') ? read : [...read, 'consent'];
    setRead(next);
    updateScenario03State({ documentsRead: next, consentSigned: true });
    addWarningFlags('opened_fake_documents', 'signed_consent');
    setOpenIndex(null);
    // The first officer's call ends here and the prosecutor's call rings on
    // the very next screen - no preview overlay, no extra tap in between.
    playSound('hangup');
    endFirstPoliceCall();
    navigate('/scenario03-police/prosecutor-call');
  }

  const doc = openIndex === null ? null : documents[openIndex];
  // The one task that is actually open right now: every earlier task is done
  // and every later one is locked, so this checklist never offers the player
  // more than one thing to do at a time.
  const activeTaskIndex = caseSiteTasks.findIndex((task) => !read.includes(task.key));
  const docSurfaceId = doc?.consent ? 'scenario03/case-site/consent' : 'scenario03/case-site/document';
  // Only ever one task is "the thing to do right now" (the first unread one);
  // everything after it reads as 尚未解鎖, everything before it as 已完成.
  const doneCount = caseSiteTasks.filter((task) => read.includes(task.key)).length;

  // AR Interaction Contract, in the order the screen stacks:
  //
  //   a document is open -> single, RIGHT closes it (or signs the consent,
  //                         which is what that document's own footer button
  //                         does; signing ends the officer's call and the
  //                         prosecutor's ring screen comes next)
  //   otherwise          -> single, RIGHT opens the one unlocked task; the
  //                         completed and locked rows are not actions, and the
  //                         locked ones are disabled in the UI too
  //
  // The `complete` state below is a guard, not a step of the run: closeDoc
  // never completes the consent task, so the only way all four are done is a
  // session that signed the consent earlier and came back - and that session
  // is already on its way out through the mount-guard redirect above.
  useARInteraction(doc
    ? {
      mode: 'single',
      surfaceId: docSurfaceId,
      action: doc.consent ? submitConsent : closeDoc,
    }
    : activeTaskIndex === -1
      ? { mode: 'display', surfaceId: 'scenario03/case-site/complete' }
      : {
        mode: 'single',
        surfaceId: 'scenario03/case-site',
        action: () => openDoc(activeTaskIndex),
      });

  return (
    <PoliceFrame stepKey="case-site" statusTitle={t.caseSite.statusTitle}>
      <div className="pol-site">
        <header className="pol-site-header">
          <h1>{t.caseSite.siteHeader(prosecutors)}</h1>
          <p>{t.caseSite.siteWarning}</p>
          <span className="pol-site-url">https://case-verify-{(session.caseNumber ?? '').toLowerCase()}.sim-example.tw</span>
        </header>

        <div className="pol-site-body">
          <Countdown deadlineAt={session.deadlineAt} label={t.caseSite.countdownLabel} />

          <section className="pol-card">
            <h3>{t.caseSite.caseInfoHeader}</h3>
            <dl className="pol-kv">
              <dt>{t.caseSite.caseNumberLabel}</dt><dd>{session.caseNumber}</dd>
              <dt>{t.caseSite.partyLabel}</dt><dd>{t.caseSite.partyValue}</dd>
              <dt>{t.caseSite.receivingUnitLabel}</dt>
              <dd>
                {police}
                {policeUnit.handlingUnit && policeUnit.handlingUnit !== police && (
                  <><br />{policeUnit.handlingUnit}</>
                )}
              </dd>
              <dt>{t.caseSite.directingAgencyLabel}</dt><dd>{prosecutors}</dd>
              <dt>{t.caseSite.prosecutorLabel}</dt><dd>{getProsecutorDisplayName(session, lang)}</dd>
              <dt>{t.caseSite.caseStatusLabel}</dt><dd style={{ color: '#ec3013' }}>{t.caseSite.caseStatusValue}</dd>
            </dl>
          </section>

          <section style={{ display: 'grid', gap: 8 }}>
            <div className="pol-task-progress">
              <span className="pol-task-progress-label">{t.caseSite.progressLabel}</span>
              <span className="pol-task-progress-count">{doneCount} / {caseSiteTasks.length}</span>
              <span className="pol-task-progress-bar" aria-hidden="true">
                <i style={{ width: `${(doneCount / caseSiteTasks.length) * 100}%` }} />
              </span>
            </div>

            {caseSiteTasks.map((task, i) => {
              const done = read.includes(task.key);
              const locked = i > 0 && !read.includes(caseSiteTasks[i - 1].key);
              const active = !done && !locked;
              return (
                <button
                  key={task.key}
                  type="button"
                  className={`pol-task${done ? ' is-done' : ''}${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}`}
                  disabled={locked}
                  onClick={() => openDoc(i)}
                >
                  <span className="pol-task-num">{done ? '✓' : i + 1}</span>
                  <span className="pol-task-main">
                    <span className="pol-task-label">
                      {task.label}
                      {active && <span className="pol-task-badge">{t.caseSite.taskBadge}</span>}
                    </span>
                    <span className="pol-task-hint">{task.hint}</span>
                  </span>
                  <span className="pol-task-state">
                    {done ? t.caseSite.taskDone : locked ? t.caseSite.taskLocked : <span className="pol-task-go">{t.caseSite.taskGo}</span>}
                  </span>
                </button>
              );
            })}
          </section>
        </div>

        {doc && (
          <div className="pol-doc-overlay" role="dialog" aria-modal="true">
            <div className="pol-doc">
              <div className="pol-doc-bar">
                <span>{doc.serial}.pdf</span>
                <button type="button" className="pol-doc-close" onClick={closeDoc}>{t.caseSite.docClose}</button>
              </div>
              <div className="pol-doc-page">
                <div className="pol-doc-issuer">{doc.issuer}</div>
                <div className="pol-doc-title">{doc.title}</div>
                <div className="pol-doc-serial">{t.caseSite.docSerial(doc.serial)}</div>
                <dl className="pol-doc-rows">
                  {doc.rows.map(([k, v]) => (
                    <div key={k} style={{ display: 'contents' }}>
                      <dt>{k}</dt><dd>{v}</dd>
                    </div>
                  ))}
                </dl>
                {doc.table && (
                  <table className="pol-doc-table">
                    <thead>
                      <tr>{t.caseSite.tableHead.map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {doc.table.map((row) => (
                        <tr key={row[1]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {doc.paragraphs.map((p) => <p key={p} className="pol-doc-p">{p}</p>)}
                {doc.consent && (
                  <p className="pol-doc-consent-text">{doc.consent}</p>
                )}
                <div className="pol-doc-seal">
                  <span>{doc.issuer}<br />{t.caseSite.docSeal}</span>
                </div>
              </div>
              <div className="pol-doc-footer">
                {doc.consent ? (
                  <button type="button" className="pol-cta" onClick={submitConsent}>
                    {t.caseSite.submitConsent}
                  </button>
                ) : (
                  <button type="button" className="pol-cta" onClick={closeDoc}>{t.caseSite.readAndBack}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PoliceFrame>
  );
}
