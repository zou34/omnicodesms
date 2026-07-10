import { AtSign, MessageCircle, Send, TrendingUp, Video } from "lucide-react";

const ROWS: { flag: string; country: string; service: string }[] = [
  { flag: "🇺🇸", country: "États-Unis", service: "WhatsApp" },
  { flag: "🇫🇷", country: "France", service: "Telegram" },
  { flag: "🇬🇧", country: "Royaume-Uni", service: "WhatsApp" },
  { flag: "🇩🇪", country: "Allemagne", service: "Telegram" },
  { flag: "🇧🇷", country: "Brésil", service: "WhatsApp" },
];

const BUBBLES = [
  {
    icon: MessageCircle,
    colorClass: "text-emerald-400",
    position: "-left-10 top-14 sm:-left-16",
    size: "h-16 w-16",
    animation: "animate-float",
  },
  {
    icon: Send,
    colorClass: "text-sky-400",
    position: "-right-8 top-36 sm:-right-14",
    size: "h-14 w-14",
    animation: "animate-float-slow",
  },
  {
    icon: Video,
    colorClass: "text-red-400",
    position: "-left-6 bottom-28 sm:-left-12",
    size: "h-16 w-16",
    animation: "animate-float-slower",
  },
  {
    icon: AtSign,
    colorClass: "text-violet-400",
    position: "-right-10 bottom-8 sm:-right-16",
    size: "h-12 w-12",
    animation: "animate-float",
  },
] as const;

export function PhoneShowcase() {
  return (
    <div className="relative flex justify-center px-6 pb-24 sm:pb-32">
      {/* `perspective` must be on the direct parent of the transformed
          phone element to take effect — a grandparent has no visual
          effect since 3D perspective doesn't propagate through
          non-transformed intermediate boxes. */}
      <div className="relative [perspective:1100px]">
        {/* Floating service bubbles — hidden on mobile to keep the phone
            centered and the viewport width intact. */}
        {BUBBLES.map(({ icon: Icon, colorClass, position, size, animation }, index) => (
          <div
            key={index}
            className={`absolute hidden items-center justify-center rounded-full bg-white/10 shadow-xl ring-1 ring-white/20 backdrop-blur-md sm:flex ${size} ${position} ${animation}`}
          >
            <Icon className={`h-7 w-7 ${colorClass}`} />
          </div>
        ))}

        {/* Phone frame — flat on mobile, tilted with real 3D perspective from sm: up. */}
        <div className="relative h-[520px] w-[260px] rounded-[3rem] border-[10px] border-slate-800 bg-slate-950 shadow-2xl shadow-blue-950/60 transition-transform duration-700 ease-out hover:sm:[transform:rotateY(-22deg)_rotateX(9deg)_rotate(-3deg)_scale(1.02)] sm:h-[600px] sm:w-[300px] sm:[transform:rotateY(-30deg)_rotateX(12deg)_rotate(-4deg)]">
          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-4 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />

          {/* Screen */}
          <div className="absolute inset-2 overflow-hidden rounded-[2.4rem] bg-slate-50">
            <div className="flex h-full flex-col px-4 pb-4 pt-9">
              <div className="mb-4 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                <span>9:41</span>
                <span>●●●●</span>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-900">OmniCodeSMS</span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-2xl bg-blue-600 px-4 py-3 text-white">
                <div>
                  <p className="text-[10px] font-medium text-blue-100">Taux de succès</p>
                  <p className="text-lg font-extrabold">98.7%</p>
                </div>
                <TrendingUp className="h-6 w-6 text-blue-200" />
              </div>

              <div className="flex-1 space-y-2">
                {ROWS.map((row) => (
                  <div
                    key={row.country}
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg leading-none">{row.flag}</span>
                      <div>
                        <p className="text-xs font-semibold leading-tight text-slate-800">
                          {row.country}
                        </p>
                        <p className="text-[10px] leading-tight text-slate-400">{row.service}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white"
                    >
                      Acheter
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
