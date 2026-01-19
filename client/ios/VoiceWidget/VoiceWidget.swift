import SwiftUI
import WidgetKit

struct VoiceWidgetEntry: TimelineEntry {
    let date: Date
}

struct VoiceWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> VoiceWidgetEntry {
        VoiceWidgetEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (VoiceWidgetEntry) -> Void) {
        completion(VoiceWidgetEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<VoiceWidgetEntry>) -> Void) {
        let entry = VoiceWidgetEntry(date: Date())
        completion(Timeline(entries: [entry], policy: .never))
    }
}

struct VoiceWidgetView: View {
    var entry: VoiceWidgetEntry

    var body: some View {
        ZStack {
            ContainerRelativeShape()
                .fill(
                    LinearGradient(
                        colors: [Color(red: 0.13, green: 0.16, blue: 0.22), Color(red: 0.07, green: 0.1, blue: 0.16)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )

            VStack(spacing: 8) {
                ZStack {
                    Circle()
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 54, height: 54)
                    Image(systemName: "mic.fill")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(Color.white)
                }

                Text("Voice add")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Color.white.opacity(0.9))
            }
            .padding(12)
        }
        .widgetURL(URL(string: "expense-tracker://voice"))
    }
}

struct VoiceWidget: Widget {
    let kind: String = "VoiceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: VoiceWidgetProvider()) { entry in
            VoiceWidgetView(entry: entry)
        }
        .configurationDisplayName("Voice add")
        .description("Quickly add an expense using voice.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
