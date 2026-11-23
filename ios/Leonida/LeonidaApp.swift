import SwiftUI

/// Abre direto no mapa: sem telas intermediárias.
@main
struct LeonidaApp: App {
    var body: some Scene {
        WindowGroup {
            MapWebView()
                .ignoresSafeArea()
                .background(Color("LaunchBackground"))
                .preferredColorScheme(.dark)
        }
    }
}
