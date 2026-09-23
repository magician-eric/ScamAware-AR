import UIKit
import WebKit

/// Hosts the bundled ScamAware web experience in a full-screen WKWebView.
///
/// Every byte the page loads comes from the app bundle (`www/`) through
/// `BundleSchemeHandler` at `app://localhost/`. Nothing is fetched from the
/// network, so the app works in aeroplane mode.
///
/// Why a custom scheme and not `loadFileURL`: `navigator.mediaDevices`
/// (getUserMedia, needed for the camera) only exists in a secure context, and
/// `file://` pages are not one. A WKURLSchemeHandler origin is — this is the
/// same approach Capacitor uses (`capacitor://localhost`).
final class WebViewController: UIViewController {
    static let scheme = "app"
    static let host = "localhost"
    static let startURL = URL(string: "\(scheme)://\(host)/index.html")!
    /// #06162d — the web app's own theme / background colour.
    static let backgroundColor = UIColor(red: 6 / 255, green: 22 / 255, blue: 45 / 255, alpha: 1)

    private var webView: WKWebView!

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(BundleSchemeHandler(), forURLScheme: Self.scheme)

        // The camera preview (<video srcObject=stream>) and every scenario video
        // play inside the page, never in the iOS full-screen player.
        configuration.allowsInlineMediaPlayback = true
        // Scenario videos and voice lines start on their own, as they do on the
        // Android build; a visitor should not have to tap "play".
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.allowsPictureInPictureMediaPlayback = false

        let contentController = WKUserContentController()
        contentController.addUserScript(Self.appIdentityScript())
        contentController.addUserScript(Self.touchOnlyStyleScript())
        configuration.userContentController = contentController

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.isOpaque = false
        webView.backgroundColor = Self.backgroundColor
        webView.scrollView.backgroundColor = Self.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never // the page handles env(safe-area-inset-*)
        webView.scrollView.delegate = self
        webView.allowsLinkPreview = false
        webView.allowsBackForwardNavigationGestures = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        if #available(iOS 16.4, *) {
            // Lets a Mac's Safari Web Inspector attach if one is ever available.
            // Harmless without one; this build is internal only.
            webView.isInspectable = true
        }
        self.webView = webView
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: Self.startURL))
    }

    // MARK: - Injected scripts

    /// `window.__scamAwareIOS` — read by web/src/lib/releaseInfo.js so the staff
    /// screen can show which build this iPhone runs.
    private static func appIdentityScript() -> WKUserScript {
        let info = Bundle.main.infoDictionary ?? [:]
        let identity: [String: String] = [
            "platform": "ios",
            "version": info["CFBundleShortVersionString"] as? String ?? "unknown",
            "build": info["CFBundleVersion"] as? String ?? "unknown",
            "bundleId": Bundle.main.bundleIdentifier ?? "",
        ]
        let json = (try? JSONSerialization.data(withJSONObject: identity))
            .flatMap { String(data: $0, encoding: .utf8) } ?? "{}"
        return WKUserScript(
            source: "window.__scamAwareIOS = Object.freeze(\(json));",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
    }

    /// Makes the page behave like an app rather than a web page under a finger:
    /// no long-press callout / text-selection loupe on artwork and buttons, and
    /// no double-tap zoom. Form fields stay selectable so typing still works.
    private static func touchOnlyStyleScript() -> WKUserScript {
        let css = """
        html{-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;-webkit-text-size-adjust:100%;touch-action:manipulation}
        input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text}
        """
        let source = """
        (function(){var s=document.createElement('style');s.textContent=\(Self.jsString(css));
        (document.head||document.documentElement).appendChild(s);})();
        """
        return WKUserScript(source: source, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
    }

    private static func jsString(_ value: String) -> String {
        let data = try? JSONSerialization.data(withJSONObject: [value])
        let array = data.flatMap { String(data: $0, encoding: .utf8) } ?? "[\"\"]"
        return String(array.dropFirst().dropLast())
    }

    private static func isBundleURL(_ url: URL?) -> Bool {
        guard let url else { return false }
        if url.absoluteString == "about:blank" || url.scheme == "blob" || url.scheme == "data" { return true }
        return url.scheme == scheme && url.host == host
    }
}

// MARK: - Navigation: the page may never leave the bundle

extension WebViewController: WKNavigationDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        // Scenarios render fake scam sites and links as part of the story; an
        // offline demo must never actually open them.
        if Self.isBundleURL(navigationAction.request.url) {
            decisionHandler(.allow)
        } else {
            NSLog("[ScamAware-iOS] blocked navigation to %@", navigationAction.request.url?.absoluteString ?? "nil")
            decisionHandler(.cancel)
        }
    }

    /// iOS may kill the web content process under memory pressure (large videos
    /// + TensorFlow.js). Reload rather than leaving a blank screen.
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("[ScamAware-iOS] web content process terminated; reloading")
        webView.load(URLRequest(url: Self.startURL))
    }
}

// MARK: - UI delegate: camera permission, window.open, alert()

extension WebViewController: WKUIDelegate {
    /// Grants the page's getUserMedia request for our own origin without WebKit's
    /// extra per-page "localhost would like to use the camera" prompt. iOS itself
    /// still asks once, using NSCameraUsageDescription; if the user declines
    /// there, getUserMedia fails and the scan page offers manual scenario
    /// selection.
    @available(iOS 15.0, *)
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        let ownOrigin = origin.protocol == Self.scheme && origin.host == Self.host
        decisionHandler(ownOrigin && type == .camera ? .grant : .deny)
    }

    /// `window.open` / `target=_blank`: never opens a new window or Safari.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        nil
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping () -> Void
    ) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping (Bool) -> Void
    ) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "取消 / Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
}

// MARK: - No pinch zoom

extension WebViewController: UIScrollViewDelegate {
    func viewForZooming(in scrollView: UIScrollView) -> UIView? { nil }
}
