import { useEffect, useState } from 'react';
import {
  formatDiagnosticDetail,
  getScanDiagnostics,
  subscribeScanDiagnostics,
} from '../../lib/ar/scanDiagnostics';
import { describeRelease } from '../../lib/releaseInfo';

// The scan pipeline, on the glasses, without a laptop.
//
// Everything this shows is already in the console log that
// lib/ar/scanDiagnostics.js writes - and on the glasses that log is behind a
// USB cable, `adb logcat`, and a second person to hold the phone. A tester
// wearing the glasses has none of those, and "the camera did not work" is all
// they can report from the player-facing screen, which by design says one
// sentence and offers a manual fallback.
//
// So this draws the same records over the scan page: one line per layer, in
// the order they must succeed, so the first line that is not OK is the layer
// that broke. It renders whatever has been recorded rather than a fixed
// checklist, which is what keeps it from drifting out of step with the module
// that does the recording.
//
// Never on for a player: the caller decides with `isScanDiagnosticsEnabled()`
// and this component renders nothing without it.

const LABELS = {
  descriptor: 'Descriptor',
  cameraSource: 'Camera source',
  mjpegRequest: 'MJPEG',
  firstFrame: 'Frame',
  streamProbe: 'Stream probe',
  preview: 'Preview',
  imageRecognition: 'Recognition',
  dataset: 'Dataset',
  match: 'Last match',
};

const STATUS_CLASS = {
  ok: 'ar-scan-diag-ok',
  fail: 'ar-scan-diag-fail',
  pending: 'ar-scan-diag-pending',
  info: 'ar-scan-diag-info',
  opened: 'ar-scan-diag-ok',
};

export function ArScanDiagnosticsOverlay({ enabled = false }) {
  const [records, setRecords] = useState([]);
  // Read on mount, not at module scope: the Shell publishes its half of the version pair when
  // the page finishes loading, which can be after this module first evaluated.
  const [release, setRelease] = useState(describeRelease);

  useEffect(() => {
    if (!enabled) return undefined;
    // Read once on mount as well as on every change: the camera starts in the
    // page's own effect, and whichever of the two runs first must not decide
    // whether the first few layers are visible.
    setRecords(getScanDiagnostics());
    setRelease(describeRelease());
    return subscribeScanDiagnostics(() => setRecords(getScanDiagnostics()));
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="ar-scan-diag" role="status" aria-live="polite">
      <div className="ar-scan-diag-title">AR SCAN DIAGNOSTICS</div>
      {/* Which Shell + which Web Bundle this device is holding. The two are released
          separately (docs/RELEASE_VERSIONING.md), so a report of "the glasses show the old
          flow" is unanswerable without both - and this overlay is the only place on the
          glasses where either can be read. */}
      <div className="ar-scan-diag-line ar-scan-diag-info">
        <span className="ar-scan-diag-step">Release</span>
        <span className="ar-scan-diag-detail">{release}</span>
      </div>
      {records.length === 0 && <div className="ar-scan-diag-line">starting…</div>}
      {records.map((record) => (
        <div key={record.step} className={`ar-scan-diag-line ${STATUS_CLASS[record.status] ?? 'ar-scan-diag-info'}`}>
          <span className="ar-scan-diag-step">{LABELS[record.step] ?? record.step}</span>
          <span className="ar-scan-diag-status">{record.status}</span>
          <span className="ar-scan-diag-detail">{formatDiagnosticDetail(record.detail)}</span>
        </div>
      ))}
    </div>
  );
}
