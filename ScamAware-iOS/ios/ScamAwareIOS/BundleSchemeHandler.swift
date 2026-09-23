import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the bundled web app (`www/` in the app bundle) at `app://localhost/`.
///
/// Byte-range requests are supported because WebKit's media stack asks for
/// `Range: bytes=…` when it plays <video>/<audio>; a handler that always
/// answers 200 with the whole body makes scenario videos fail to start or
/// seek on iOS. Files are read in slices from disk rather than loaded whole,
/// so a 30 MB scenario video does not have to fit in memory at once.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root: URL
    private let queue = DispatchQueue(label: "ScamAwareIOS.BundleSchemeHandler", qos: .userInitiated)
    /// Tasks WebKit has cancelled. Calling a stopped task throws an
    /// Objective-C exception, so every callback checks this first (main thread only).
    private var stoppedTasks = Set<ObjectIdentifier>()
    private static let chunkSize = 512 * 1024

    override init() {
        guard let www = Bundle.main.url(forResource: "www", withExtension: nil) else {
            fatalError("www/ is missing from the app bundle - run scripts/build-web.sh before building")
        }
        root = www.standardizedFileURL
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        let request = urlSchemeTask.request
        let id = ObjectIdentifier(urlSchemeTask)
        guard let url = request.url, let fileURL = resolve(url) else {
            respond(urlSchemeTask, id: id, status: 404, headers: [:], body: Data("Not found".utf8))
            return
        }
        let rangeHeader = request.value(forHTTPHeaderField: "Range")

        queue.async { [weak self] in
            self?.serve(fileURL: fileURL, requestURL: url, rangeHeader: rangeHeader, task: urlSchemeTask, id: id)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        stoppedTasks.insert(ObjectIdentifier(urlSchemeTask))
    }

    // MARK: - Path resolution

    /// Maps `app://localhost/<path>` to a file inside `www/`, refusing anything
    /// that escapes it. An extension-less path that is not a file falls back to
    /// index.html (the app uses HashRouter, so this is only a safety net).
    private func resolve(_ url: URL) -> URL? {
        var path = url.path.removingPercentEncoding ?? url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let candidate = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard candidate.path.hasPrefix(root.path + "/") else { return nil }

        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDirectory) {
            if isDirectory.boolValue {
                let index = candidate.appendingPathComponent("index.html")
                return FileManager.default.fileExists(atPath: index.path) ? index : nil
            }
            return candidate
        }
        if candidate.pathExtension.isEmpty {
            return root.appendingPathComponent("index.html")
        }
        return nil
    }

    // MARK: - Serving

    private func serve(fileURL: URL, requestURL: URL, rangeHeader: String?, task: WKURLSchemeTask, id: ObjectIdentifier) {
        // Forget the task once this function is done with it, on every path:
        // ObjectIdentifiers are memory addresses and get reused by later tasks.
        // (`task` is retained until then, so its address cannot be reused early.)
        defer { DispatchQueue.main.async { [weak self] in self?.stoppedTasks.remove(id) } }
        guard let handle = try? FileHandle(forReadingFrom: fileURL),
              let size = (try? FileManager.default.attributesOfItem(atPath: fileURL.path)[.size] as? NSNumber)?.int64Value
        else {
            respond(task, id: id, status: 404, headers: [:], body: Data("Not found".utf8))
            return
        }
        defer { try? handle.close() }

        let mime = Self.mimeType(for: fileURL)
        var headers: [String: String] = [
            "Content-Type": mime,
            "Accept-Ranges": "bytes",
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        ]

        var start: Int64 = 0
        var end: Int64 = max(size - 1, 0)
        var status = 200

        if let rangeHeader, let range = Self.parseRange(rangeHeader, size: size) {
            (start, end) = range
            status = 206
            headers["Content-Range"] = "bytes \(start)-\(end)/\(size)"
        } else if rangeHeader != nil, size > 0 {
            headers["Content-Range"] = "bytes */\(size)"
            respond(task, id: id, status: 416, headers: headers, body: Data())
            return
        }

        let length = size == 0 ? 0 : end - start + 1
        headers["Content-Length"] = String(length)

        let response = HTTPURLResponse(url: requestURL, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!
        guard onMain(id, { task.didReceive(response) }) else { return }

        do {
            try handle.seek(toOffset: UInt64(start))
            var remaining = length
            while remaining > 0 {
                let count = Int(min(Int64(Self.chunkSize), remaining))
                guard let chunk = try handle.read(upToCount: count), !chunk.isEmpty else { break }
                remaining -= Int64(chunk.count)
                guard onMain(id, { task.didReceive(chunk) }) else { return }
            }
            _ = onMain(id, { task.didFinish() })
        } catch {
            _ = onMain(id, { task.didFailWithError(error) })
        }
    }

    private func respond(_ task: WKURLSchemeTask, id: ObjectIdentifier, status: Int, headers: [String: String], body: Data) {
        let url = task.request.url ?? URL(string: "app://localhost/")!
        var allHeaders = headers
        allHeaders["Content-Length"] = String(body.count)
        if allHeaders["Content-Type"] == nil { allHeaders["Content-Type"] = "text/plain; charset=utf-8" }
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: allHeaders)!
        let deliver = {
            guard !self.stoppedTasks.contains(id) else { return }
            task.didReceive(response)
            if !body.isEmpty { task.didReceive(body) }
            task.didFinish()
        }
        if Thread.isMainThread { deliver() } else { DispatchQueue.main.async(execute: deliver) }
    }

    /// Runs `work` on the main thread unless WebKit has stopped the task.
    /// Returns false once the task is stopped, so the reader can give up.
    private func onMain(_ id: ObjectIdentifier, _ work: @escaping () -> Void) -> Bool {
        var stillRunning = true
        DispatchQueue.main.sync {
            if stoppedTasks.contains(id) {
                stillRunning = false
            } else {
                work()
            }
        }
        return stillRunning
    }

    // MARK: - Helpers

    /// `bytes=START-END`, `bytes=START-` or `bytes=-SUFFIX`. Multi-range requests
    /// are answered with the first range only, which WebKit's media loader accepts.
    static func parseRange(_ header: String, size: Int64) -> (Int64, Int64)? {
        guard size > 0, header.hasPrefix("bytes=") else { return nil }
        let spec = header.dropFirst("bytes=".count).split(separator: ",").first.map(String.init) ?? ""
        let parts = spec.split(separator: "-", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
        guard parts.count == 2 else { return nil }

        if parts[0].isEmpty {
            guard let suffix = Int64(parts[1]), suffix > 0 else { return nil }
            return (max(size - suffix, 0), size - 1)
        }
        guard let start = Int64(parts[0]), start < size else { return nil }
        let end = parts[1].isEmpty ? size - 1 : min(Int64(parts[1]) ?? (size - 1), size - 1)
        guard end >= start else { return nil }
        return (start, end)
    }

    private static let knownTypes: [String: String] = [
        "html": "text/html; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "mjs": "text/javascript; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "json": "application/json; charset=utf-8",
        "webmanifest": "application/manifest+json",
        "svg": "image/svg+xml",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "ico": "image/x-icon",
        "mp4": "video/mp4",
        "m4v": "video/mp4",
        "webm": "video/webm",
        "mov": "video/quicktime",
        "mp3": "audio/mpeg",
        "m4a": "audio/mp4",
        "aac": "audio/aac",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "ttf": "font/ttf",
        "otf": "font/otf",
        "wasm": "application/wasm",
        "vtt": "text/vtt",
        "txt": "text/plain; charset=utf-8",
        "mind": "application/octet-stream",
        "bin": "application/octet-stream",
    ]

    static func mimeType(for url: URL) -> String {
        let ext = url.pathExtension.lowercased()
        if let known = knownTypes[ext] { return known }
        if let type = UTType(filenameExtension: ext), let mime = type.preferredMIMEType { return mime }
        return "application/octet-stream"
    }
}
