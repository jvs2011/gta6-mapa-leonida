import SwiftUI
import UniformTypeIdentifiers
import WebKit

/// O mapa (pasta `web/` embutida no app) rodando num WKWebView em tela cheia.
/// Tudo é local: funciona sem internet desde a primeira abertura.
struct MapWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(LocalFiles(), forURLScheme: LocalFiles.scheme)

        // Progresso salvo no UserDefaults e entregue ao JS antes da página carregar.
        let ucc = config.userContentController
        ucc.add(context.coordinator, name: "store")
        ucc.add(context.coordinator, name: "share")
        let saved = UserDefaults.standard.string(forKey: Coordinator.stateKey)
        let literal = saved.flatMap { try? JSONEncoder().encode($0) }.flatMap { String(data: $0, encoding: .utf8) } ?? "null"
        ucc.addUserScript(WKUserScript(source: "window.__NATIVE_STATE__ = \(literal);",
                                       injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        let navy = UIColor(red: 6 / 255, green: 10 / 255, blue: 27 / 255, alpha: 1)
        web.isOpaque = false
        web.backgroundColor = navy
        web.scrollView.backgroundColor = navy
        web.scrollView.isScrollEnabled = false
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.allowsLinkPreview = false
        web.uiDelegate = context.coordinator
        web.navigationDelegate = context.coordinator
        if #available(iOS 16.4, *) { web.isInspectable = true } // depurar pelo Safari do Mac
        context.coordinator.webView = web
        web.load(URLRequest(url: URL(string: "\(LocalFiles.scheme)://app/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
        static let stateKey = "leonida.state"
        weak var webView: WKWebView?

        // MARK: mensagens do JS
        func userContentController(_ ucc: WKUserContentController, didReceive message: WKScriptMessage) {
            switch message.name {
            case "store":
                if let json = message.body as? String {
                    UserDefaults.standard.set(json, forKey: Self.stateKey)
                }
            case "share":
                guard let body = message.body as? [String: Any],
                      let name = body["name"] as? String,
                      let data = (body["data"] as? String)?.data(using: .utf8) else { return }
                let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
                try? data.write(to: url)
                let vc = UIActivityViewController(activityItems: [url], applicationActivities: nil)
                if let pop = vc.popoverPresentationController, let v = webView {
                    pop.sourceView = v
                    pop.sourceRect = CGRect(x: v.bounds.midX, y: v.bounds.midY, width: 1, height: 1)
                }
                Self.top()?.present(vc, animated: true)
            default:
                break
            }
        }

        // MARK: alert / confirm / prompt do JS
        func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
            present(a) { completionHandler() }
        }

        func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                     initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
            let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
            a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(false) })
            a.addAction(UIAlertAction(title: "OK", style: .destructive) { _ in completionHandler(true) })
            present(a) { completionHandler(false) }
        }

        func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                     defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping (String?) -> Void) {
            let a = UIAlertController(title: prompt, message: nil, preferredStyle: .alert)
            a.addTextField { tf in
                tf.text = defaultText
                tf.clearButtonMode = .whileEditing
                tf.autocapitalizationType = .sentences
            }
            a.addAction(UIAlertAction(title: "Cancelar", style: .cancel) { _ in completionHandler(nil) })
            a.addAction(UIAlertAction(title: "Salvar", style: .default) { _ in
                completionHandler(a.textFields?.first?.text)
            })
            present(a) { completionHandler(nil) }
        }

        private func present(_ vc: UIViewController, otherwise fallback: () -> Void) {
            if let top = Self.top() { top.present(vc, animated: true) } else { fallback() }
        }

        // MARK: links externos abrem no Safari
        func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            if let url = action.request.url, ["http", "https", "mailto"].contains(url.scheme ?? "") {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = action.request.url { UIApplication.shared.open(url) }
            return nil
        }

        func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
            webView.reload()
        }

        static func top() -> UIViewController? {
            let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
            let scene = scenes.first(where: { $0.activationState == .foregroundActive }) ?? scenes.first
            let window = scene?.windows.first(where: { $0.isKeyWindow }) ?? scene?.windows.first
            var vc = window?.rootViewController
            while let p = vc?.presentedViewController { vc = p }
            return vc
        }
    }
}

/// Serve os arquivos da pasta `web/` do bundle em leonida://app/…
/// (assim `fetch()` funciona, coisa que file:// não permite).
final class LocalFiles: NSObject, WKURLSchemeHandler {
    static let scheme = "leonida"
    private let root = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true).standardizedFileURL

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let file = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard file.path.hasPrefix(root.path), let data = try? Data(contentsOf: file) else {
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didReceive(Data())
            task.didFinish()
            return
        }
        let mime = UTType(filenameExtension: file.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        let headers = ["Content-Type": mime, "Content-Length": String(data.count), "Access-Control-Allow-Origin": "*"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
