import { getIosAppRelease, getWebBundleRelease } from '../../lib/releaseInfo';

// ScamAware-iOS replacement for the Android StaffVersionPanel.
//
// The Android panel drives the APK's OTA updater (check / download / restart).
// None of that exists here: the iOS port is installed and updated only as a
// whole, Ad Hoc–signed .ipa, and the web content inside it never changes after
// installation. So this card only answers "which build is this iPhone
// running?", which is what a colleague needs when reporting a problem.
export function IosVersionPanel() {
  const app = getIosAppRelease();
  const bundle = getWebBundleRelease();
  const rows = [
    ['App 版本', app ? `${app.version} (build ${app.build})` : '（非 iOS App 內執行）'],
    ['Bundle ID', app?.bundleId || '—'],
    ['內建內容版本', bundle.iosVersion],
    ['內容來源 commit', bundle.gitCommit || '—'],
    ['更新方式', '重新安裝新版 .ipa（本版不支援線上更新）'],
  ];
  return (
    <div className="staff-card">
      <h2>系統版本</h2>
      <div className="staff-summary">
        {rows.map(([label, value]) => (
          <div className="staff-summary-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
