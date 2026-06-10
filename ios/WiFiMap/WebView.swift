import SwiftUI
import WebKit
import CoreLocation
import NetworkExtension
import UIKit

/// Native side of the `window.WifiNative` bridge.
///
/// iOS only exposes the SSID/BSSID/security of the connected network through
/// public API (`NEHotspotNetwork.fetchCurrent`, gated behind the
/// "Access WiFi Information" entitlement plus location permission). RSSI,
/// channel, band and channel width have **no public API on iOS**, so they
/// are omitted entirely — the web app renders only what was truly measured.
final class WifiBridge: NSObject, WKScriptMessageHandler, CLLocationManagerDelegate {
    weak var webView: WKWebView?
    private let location = CLLocationManager()

    override init() {
        super.init()
        location.delegate = self
        NotificationCenter.default.addObserver(
            self, selector: #selector(appBecameActive),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    @objc private func appBecameActive() { pushWifiInfo() }

    func requestPermissions() {
        if location.authorizationStatus == .notDetermined {
            location.requestWhenInUseAuthorization()
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        pushWifiInfo()
    }

    func userContentController(_ userContentController: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        switch message.name {
        case "refreshWifi": pushWifiInfo()
        case "printPage": printPage()
        default: break
        }
    }

    /// Fetches a Wi-Fi snapshot and pushes it into the page's JS cache.
    func pushWifiInfo() {
        snapshot { [weak self] json in
            DispatchQueue.main.async {
                self?.webView?.evaluateJavaScript(
                    "window.__setNativeWifiInfo && window.__setNativeWifiInfo(\(json))",
                    completionHandler: nil)
            }
        }
    }

    private func snapshot(_ completion: @escaping (String) -> Void) {
        let status = location.authorizationStatus
        guard status == .authorizedWhenInUse || status == .authorizedAlways else {
            completion(Self.encode(["available": false, "reason": "permission"]))
            return
        }
        NEHotspotNetwork.fetchCurrent { network in
            guard let network = network else {
                completion(Self.encode(["available": false, "reason": "not_connected"]))
                return
            }
            completion(Self.encode([
                "available": true,
                "ssid": network.ssid,
                "bssid": network.bssid,
                "security": network.isSecure ? "Secured (WPA/WPA2/WPA3)" : "Open",
            ]))
        }
    }

    private static func encode(_ object: [String: Any]) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: object),
              let json = String(data: data, encoding: .utf8) else {
            return #"{"available":false,"reason":"serialization"}"#
        }
        return json
    }

    /// window.print() is unsupported in WKWebView; present the system print
    /// dialog (which includes Save to Files as PDF) instead.
    func printPage() {
        guard let webView = webView else { return }
        let printInfo = UIPrintInfo(dictionary: nil)
        printInfo.jobName = "WiFiMap Certificate"
        printInfo.outputType = .general
        let controller = UIPrintInteractionController.shared
        controller.printInfo = printInfo
        controller.printFormatter = webView.viewPrintFormatter()
        controller.present(animated: true, completionHandler: nil)
    }
}

struct WebView: UIViewRepresentable {
    func makeCoordinator() -> WifiBridge { WifiBridge() }

    func makeUIView(context: Context) -> WKWebView {
        let bridge = context.coordinator
        let controller = WKUserContentController()
        controller.add(bridge, name: "refreshWifi")
        controller.add(bridge, name: "printPage")

        // Synchronous-looking shim matching the Android bridge contract:
        // WKWebView messaging is asynchronous, so getWifiInfo() returns the
        // latest cached snapshot and asks native for a refresh. Native pushes
        // fresh data on load, on permission changes and on app foreground.
        let shim = """
        (function () {
          var cached = JSON.stringify({ available: false, reason: "not_ready" });
          window.__setNativeWifiInfo = function (info) { cached = JSON.stringify(info); };
          window.WifiNative = {
            getWifiInfo: function () {
              try { webkit.messageHandlers.refreshWifi.postMessage(null); } catch (e) {}
              return cached;
            },
            hasPermissions: function () { return true; },
            printPage: function () { webkit.messageHandlers.printPage.postMessage(null); }
          };
        })();
        """
        controller.addUserScript(WKUserScript(
            source: shim, injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let config = WKWebViewConfiguration()
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.008, green: 0.024, blue: 0.090, alpha: 1)
        bridge.webView = webView
        bridge.requestPermissions()
        bridge.pushWifiInfo()

        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
