import { ShieldCheck, RefreshCw, Sparkles, CreditCard, RotateCcw, GraduationCap } from "lucide-react";

const TRUST_ITEMS = [
  { icon: GraduationCap, label: "Student Discount 15% OFF", detail: "Verify with college ID" },
  { icon: ShieldCheck, label: "100% Authentic Guarantee", detail: "Verified high-street brands" },
  { icon: RefreshCw, label: "Flexible Clothes Rental", detail: "Rent for 3, 7 or 14 days" },
  { icon: Sparkles, label: "AI Fit & Style Assistant", detail: "Instant outfit curation" },
  { icon: CreditCard, label: "Secure Payments & COD", detail: "UPI, Cards & Netbanking" },
  { icon: RotateCcw, label: "Hassle-Free 7-Day Returns", detail: "Free pickup at door" }
];

export default function TrustStrip() {
  return (
    <div className="bg-cm-black text-white py-6 border-y border-white/10 overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {/* Double the list for infinite marquee loop */}
        {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="flex items-center gap-3 mx-8 shrink-0 group cursor-default">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-cm-red group-hover:bg-cm-red group-hover:text-white transition-colors">
                <Icon size={16} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold tracking-wide uppercase">{item.label}</p>
                <p className="text-2xs text-cm-muted">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
