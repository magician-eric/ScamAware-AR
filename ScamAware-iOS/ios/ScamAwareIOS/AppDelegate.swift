import AVFoundation
import UIKit

/// ScamAware-iOS — standalone iPhone demo of the ScamAware-AR anti-fraud experience.
///
/// The whole experience is the bundled web app (see `WebViewController`); this
/// native layer only hosts it. There is no glasses SDK, no ToF / gesture input,
/// no USB camera and no OTA updater in this app — everything is tapped on the
/// iPhone's own screen and the rear camera is used for MindAR image recognition.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        configureAudioSession()

        // A demo device is handed to visitors and put down between runs; the
        // screen must not lock in the middle of a scenario video.
        application.isIdleTimerDisabled = true

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = WebViewController.backgroundColor
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }

    /// Scenario videos and voice lines must be audible even when the iPhone's
    /// ring/silent switch is set to silent — the default `.soloAmbient` category
    /// would mute them, which reads to a visitor as "the video has no sound".
    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            NSLog("[ScamAware-iOS] audio session setup failed: \(error)")
        }
    }
}
