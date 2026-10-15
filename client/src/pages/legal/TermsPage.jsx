import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  Camera,
  RefreshCw,
  HelpCircle,
  ArrowRight,
  ChevronRight
} from "lucide-react";

export default function TermsPage() {
  const [activeSection, setActiveSection] = useState("all");

  const sections = [
    { id: "overview", title: "1. Service Overview & Acceptance" },
    { id: "booking", title: "2. Rental Booking & ₹50 Advance" },
    { id: "handover", title: "3. Handover & Condition Inspection" },
    { id: "duration", title: "4. Rental Period, Returns & Extensions" },
    { id: "damage", title: "5. Garment Care & Fair Damage Policy" },
    { id: "cancellation", title: "6. Cancellations & Refund Policy" },
    { id: "resell", title: "7. Resale Purchase Terms" },
    { id: "liability", title: "8. Limitation of Liability & Disputes" },
    { id: "contact", title: "9. Contact & Support" }
  ];

  return (
    <div className="min-h-screen bg-cm-soft/30 py-10 sm:py-16">
      <div className="cm-container px-4 max-w-5xl mx-auto space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-2xs uppercase tracking-wider text-cm-muted font-bold">
          <Link to="/" className="hover:text-cm-black transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-cm-black">Legal</span>
          <ChevronRight size={12} />
          <span className="text-cm-red">Terms & Conditions</span>
        </nav>

        {/* Header Banner */}
        <div className="rounded-3xl bg-white border border-cm-border p-6 sm:p-10 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-2xs uppercase tracking-[0.25em] font-bold text-cm-red bg-cm-red/10 px-3 py-1 rounded-full">
              Legal Agreement
            </span>
            <span className="text-2xs text-cm-muted font-medium">
              Last Updated: October 2026 • Effective Immediately
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-cm-black">
            Terms & Conditions
          </h1>
          <p className="text-sm sm:text-base text-cm-muted max-w-3xl leading-relaxed">
            Welcome to Cloth Market. Please read these terms carefully before booking rentals or purchasing items. 
            By accessing our platform, booking a garment on WhatsApp, or completing an order, you agree to be bound by these Terms and our Privacy Policy.
          </p>

          {/* Tab Switcher between Terms and Privacy */}
          <div className="flex items-center gap-3 pt-4 border-t border-cm-border">
            <Link
              to="/terms"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cm-black text-white shadow-xs"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/privacy"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-cm-muted hover:text-cm-black border border-cm-border hover:bg-cm-soft transition"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Quick Trust Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-cm-border shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              ₹50
            </div>
            <h3 className="font-bold text-sm text-cm-black">Nominal Advance</h3>
            <p className="text-2xs text-cm-muted leading-relaxed">
              Lock your rental slot with just ₹50 advance. The balance is paid upon physical delivery/handover.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-cm-border shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Camera size={18} />
            </div>
            <h3 className="font-bold text-sm text-cm-black">Mutual Inspection</h3>
            <p className="text-2xs text-cm-muted leading-relaxed">
              Every outfit undergo a transparent physical checklist and baseline photos before handover.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-cm-border shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <h3 className="font-bold text-sm text-cm-black">Fair Damage Assessment</h3>
            <p className="text-2xs text-cm-muted leading-relaxed">
              Standard dry-cleaning is on us. Real repairs are priced transparently at actual cost with zero predatory penalties.
            </p>
          </div>
        </div>

        {/* Main Content Body */}
        <div className="bg-white rounded-3xl border border-cm-border p-6 sm:p-10 shadow-xs space-y-12">
          
          {/* Section 1 */}
          <section id="overview" className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">01.</span> Service Overview & Acceptance
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                Cloth Market provides an online and peer-to-peer apparel platform operating within India, allowing customers to rent designer and occasion wear for short-term durations, as well as purchase selected pre-owned and curated apparel items ("Resell").
              </p>
              <p>
                By creating an account, browsing our catalog, placing a rental inquiry via WhatsApp, or receiving a garment, you acknowledge that you are at least 18 years of age and legally competent to enter into a binding contract under the Indian Contract Act, 1872.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="booking" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">02.</span> Rental Booking & Confirmation Advance
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                When you initiate a rental request via our catalog, your order enters the <strong>Added to Cart / Enquiry</strong> state. Because occasion wear inventory consists of specific, high-demand size units:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>₹50 Advance Fee:</strong> A nominal confirmation advance of ₹50 is required to hold and reserve your requested dress slot. This prevents fraudulent blocking and guarantees that another customer cannot book the same outfit for your dates.
                </li>
                <li>
                  <strong>WhatsApp Verification:</strong> Payment is completed using our official verified UPI QR code or bank transfer, coordinated via Cloth Market’s official WhatsApp business contact.
                </li>
                <li>
                  <strong>Remaining Rental Fee:</strong> The remaining rental balance (Total Rental Amount minus the ₹50 advance) is payable prior to or upon physical handover/delivery (Cash on Delivery or UPI).
                </li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section id="handover" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">03.</span> Handover & Condition Inspection Protocol
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                To safeguard both customers and outfit owners, Cloth Market enforces a strict, transparent <strong>Handover Condition Inspection Protocol</strong>:
              </p>
              <div className="p-4 rounded-2xl bg-cm-soft border border-cm-border space-y-2">
                <p className="font-bold text-cm-black text-xs">Mutual Baseline Inspection Checklist:</p>
                <p className="text-2xs text-slate-600">
                  Prior to handing over the outfit, the Cloth Market administrator conducts a physical baseline assessment recording the overall condition (Pristine / Good / Fair), checks for existing stains, tears, zippers, and missing accessories, and logs baseline photo evidence directly into the system.
                </p>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>Customer Acknowledgment:</strong> Customers are requested to inspect the outfit upon receipt and confirm handover through their Cloth Market account or via WhatsApp confirmation.
                </li>
                <li>
                  <strong>Pre-existing Flaws:</strong> Any minor imperfections already recorded during the baseline inspection will never be charged to the customer upon return.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 4 */}
          <section id="duration" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">04.</span> Rental Period, Extensions & Returns
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                The rental period begins on the scheduled <strong>Rental Start Date</strong> and terminates on the <strong>Current End Date</strong> selected at the time of booking.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>On-Time Return:</strong> You agree to have the garment ready for pickup or returned on or before the agreed return date.
                </li>
                <li>
                  <strong>Rental Extensions:</strong> If you wish to extend your rental duration, you must submit an extension request via your profile or WhatsApp at least 24 hours prior to your return date. Extensions are subject to outfit availability and confirmation by the Admin at the standard daily rate.
                </li>
                <li>
                  <strong>Late Return Fee:</strong> Returns delayed without an approved extension impact subsequent bookings. A late fee of ₹150 per day (or the daily rental rate, whichever is higher) will be levied for unauthorized late returns.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section id="damage" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">05.</span> Garment Care & Fair Damage Policy
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                We want you to look your best and enjoy your event without undue stress. Our damage policy is grounded in fairness and transparency:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                  <h4 className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Normal Wear & Tear (Covered)
                  </h4>
                  <p className="text-2xs text-emerald-800 leading-relaxed">
                    Standard post-event odor, light dust on hemlines, loose threads, and minor wrinkles are completely normal. <strong>Professional dry cleaning is handled by Cloth Market at no extra charge.</strong> Do NOT wash or iron delicate fabrics yourself.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 space-y-1">
                  <h4 className="font-bold text-xs text-red-900 flex items-center gap-1.5">
                    <AlertCircle size={14} /> Assessable Damage (Billable at Cost)
                  </h4>
                  <p className="text-2xs text-red-800 leading-relaxed">
                    Permanent stains (wine, grease, dye), burns, major fabric tears, broken specialty zippers, or missing accessories will be assessed fairly at actual tailor/restoration cost. If an item is damaged beyond repair, the maximum liability will not exceed the fair market replacement value.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section id="cancellation" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">06.</span> Cancellations & Refund Policy
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>Cancellation by Customer:</strong> Cancellations made more than 48 hours before the scheduled rental pickup date are eligible for full adjustment or credit toward a future booking. Cancellations within 48 hours forfeit the ₹50 booking advance to compensate for unit reservation and lost booking opportunities.
                </li>
                <li>
                  <strong>Cancellation by Platform:</strong> In the rare event an outfit becomes unavailable due to unexpected damage by a prior renter or logistical failure, you will receive an immediate 100% refund of all amounts paid and prioritized alternative selections.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section id="resell" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">07.</span> Resale Purchase Terms
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                Items marked <strong>FOR RESALE</strong> are sold outright as owned merchandise:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>Condition badges (<em>New with tags</em>, <em>Like new</em>, <em>Gently used</em>) accurately reflect physical verification by our curation team.</li>
                <li>Resale purchases are final once delivered and inspected, except in cases where the item received materially differs from the catalog images and description.</li>
              </ul>
            </div>
          </section>

          {/* Section 8 */}
          <section id="liability" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">08.</span> Limitation of Liability & Disputes
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                To the fullest extent permitted by applicable law, Cloth Market shall not be liable for indirect, incidental, or consequential damages resulting from the use or inability to use our rental items or services.
              </p>
              <p>
                These Terms are governed by and construed in accordance with the laws of the Republic of India. Any disputes arising out of these terms shall be subject to amicable resolution first via our customer grievance desk, and subsequently to the exclusive jurisdiction of the courts of India.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="contact" className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">09.</span> Contact & Grievance Redressal
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              <p>
                If you have questions, feedback, or require assistance with an existing booking or rental return, our team is readily accessible:
              </p>
              <div className="p-4 rounded-2xl bg-cm-soft border border-cm-border text-xs space-y-1">
                <p><strong>Cloth Market Operations & Support</strong></p>
                <p>Email: <a href="mailto:support@clothmarket.com" className="text-cm-red font-medium hover:underline">support@clothmarket.com</a></p>
                <p>WhatsApp Support: Direct via the WhatsApp button in the footer or during checkout</p>
                <p>Operating Hours: Monday – Saturday, 9:30 AM to 8:30 PM IST</p>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Navigation Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-cm-border text-xs">
          <div>
            <p className="font-bold text-cm-black">Looking for our data privacy details?</p>
            <p className="text-cm-muted text-2xs">Learn how we protect your personal contact, addresses, and payment information.</p>
          </div>
          <Link
            to="/privacy"
            className="px-5 py-2.5 rounded-full bg-cm-black text-white font-bold hover:bg-neutral-800 transition flex items-center gap-1.5 shrink-0"
          >
            <span>Read Privacy Policy</span>
            <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
