import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Lock,
  EyeOff,
  UserCheck,
  FileCheck,
  Smartphone,
  Server,
  ArrowRight,
  ChevronRight,
  Mail
} from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-cm-soft/30 py-10 sm:py-16">
      <div className="cm-container px-4 max-w-5xl mx-auto space-y-10">
        
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-2xs uppercase tracking-wider text-cm-muted font-bold">
          <Link to="/" className="hover:text-cm-black transition-colors">Home</Link>
          <ChevronRight size={12} />
          <span className="text-cm-black">Legal</span>
          <ChevronRight size={12} />
          <span className="text-cm-red">Privacy Policy</span>
        </nav>

        {/* Header Banner */}
        <div className="rounded-3xl bg-white border border-cm-border p-6 sm:p-10 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-2xs uppercase tracking-[0.25em] font-bold text-emerald-800 bg-emerald-100/60 px-3 py-1 rounded-full">
              Data Protection & Privacy
            </span>
            <span className="text-2xs text-cm-muted font-medium">
              Last Updated: October 2026 • Global & Indian Compliance
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-cm-black">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-cm-muted max-w-3xl leading-relaxed">
            At Cloth Market, your trust is our highest priority. This policy clearly outlines what information we collect, how we use it to fulfill your rentals, and the strict safeguards we employ to keep your personal data private and secure.
          </p>

          {/* Tab Switcher between Terms and Privacy */}
          <div className="flex items-center gap-3 pt-4 border-t border-cm-border">
            <Link
              to="/terms"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-cm-muted hover:text-cm-black border border-cm-border hover:bg-cm-soft transition"
            >
              Terms & Conditions
            </Link>
            <Link
              to="/privacy"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-cm-black text-white shadow-xs"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Core Guarantees Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-cm-border shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <EyeOff size={18} />
            </div>
            <h3 className="font-bold text-sm text-cm-black">Zero Data Selling</h3>
            <p className="text-2xs text-cm-muted leading-relaxed">
              We never sell, rent, or trade your contact info or browsing habits to advertisers or data brokers.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-cm-border shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Lock size={18} />
            </div>
            <h3 className="font-bold text-sm text-cm-black">No Financial Storage</h3>
            <p className="text-2xs text-cm-muted leading-relaxed">
              We do not store credit card numbers or bank passwords. All payments use direct UPI QR or Cash on Delivery.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-cm-border shadow-2xs space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <UserCheck size={18} />
            </div>
            <h3 className="font-bold text-sm text-cm-black">Full User Control</h3>
            <p className="text-2xs text-cm-muted leading-relaxed">
              You can update your personal information or request complete account deletion anytime with one click.
            </p>
          </div>
        </div>

        {/* Detailed Main Policy Body */}
        <div className="bg-white rounded-3xl border border-cm-border p-6 sm:p-10 shadow-xs space-y-12">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">01.</span> Information We Collect
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                To provide you with seamless cloth rentals and curated purchases, we collect the following limited categories of information:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>Contact & Profile Details:</strong> Your full name, email address, password (stored as one-way cryptographic salted hashes), phone number, and physical delivery address.
                </li>
                <li>
                  <strong>Apparel Preferences & Sizing:</strong> Garment sizes selected (e.g., S, M, L, XL) and event booking dates needed to verify inventory slot availability.
                </li>
                <li>
                  <strong>Rental & Inspection Records:</strong> Rental order timelines, mutual handover condition checklists, and inspection baseline photos uploaded to protect both renters and owners.
                </li>
                <li>
                  <strong>Payment Verification References:</strong> UPI transaction reference numbers, UTR IDs, or payment screenshots submitted for manual verification. We do not store card numbers or banking credentials.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">02.</span> How We Use Your Information
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                Your data is strictly utilized to operate and improve our rental service:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-cm-soft border border-cm-border space-y-1">
                  <p className="font-bold text-xs text-cm-black flex items-center gap-1.5">
                    <Smartphone size={14} className="text-cm-red" /> WhatsApp Order Coordination
                  </p>
                  <p className="text-2xs text-slate-600">
                    To send instant booking confirmations, ₹50 advance QR codes, delivery coordination, and return reminders.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-cm-soft border border-cm-border space-y-1">
                  <p className="font-bold text-xs text-cm-black flex items-center gap-1.5">
                    <FileCheck size={14} className="text-cm-red" /> Rental Inventory Protection
                  </p>
                  <p className="text-2xs text-slate-600">
                    To reserve specific physical garment units, track rental calendars, and verify mutual inspection conditions.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">03.</span> Payment & Financial Security
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                Cloth Market is committed to absolute payment safety:
              </p>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-700" /> Zero Financial Data Storage Policy
                </p>
                <p className="text-2xs text-emerald-800 leading-relaxed">
                  We operate via peer-to-peer verified UPI QR codes and Cash on Delivery. We never ask for, process, or store your debit/credit card CVVs, PINs, or bank netbanking passwords. All UPI transfers occur directly inside your trusted banking app (Google Pay, PhonePe, Paytm, BHIM).
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">04.</span> Information Sharing & Third Parties
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                We do not sell, rent, or monetize your personal data. We disclose your information only to the minimum extent necessary:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>Delivery & Logistics Partners:</strong> Only your name, delivery address, and contact number are provided to the courier or handover personnel fulfilling your order.
                </li>
                <li>
                  <strong>Legal Requirements:</strong> If required by Indian law enforcement or regulatory authorities pursuant to valid legal processes.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">05.</span> Data Retention & Image Privacy
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                Handover inspection photos and condition notes are recorded strictly to resolve any damage disputes. Once a rental cycle is completed and the garment is received back in good order, inspection records are archived and stored in encrypted storage accessible only to system administrators.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">06.</span> Your Rights & Choices
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                You maintain complete ownership of your personal data:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-slate-700">
                <li>
                  <strong>Access & Update:</strong> You can review or edit your name, email, addresses, and wishlist anytime from your <Link to="/profile" className="text-cm-red font-semibold hover:underline">Profile Page</Link>.
                </li>
                <li>
                  <strong>Account Deletion:</strong> You have the right to request the complete deletion of your account and associated personal data by emailing our support desk, provided there are no active, unreturned rentals in progress.
                </li>
              </ul>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 pt-6 border-t border-cm-border">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-cm-black flex items-center gap-2">
              <span className="text-cm-red text-base font-sans">07.</span> Grievance Officer & Contact
            </h2>
            <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
              <p>
                In accordance with the Information Technology Act 2000 and the Digital Personal Data Protection Act (DPDPA), if you have any questions or grievances regarding this Privacy Policy, please contact our Data Grievance Officer:
              </p>
              <div className="p-4 rounded-2xl bg-cm-soft border border-cm-border text-xs space-y-1">
                <p><strong>Cloth Market Privacy & Compliance Desk</strong></p>
                <p>Email: <a href="mailto:privacy@clothmarket.com" className="text-cm-red font-medium hover:underline">privacy@clothmarket.com</a></p>
                <p>Customer Support: <a href="mailto:support@clothmarket.com" className="text-cm-red font-medium hover:underline">support@clothmarket.com</a></p>
                <p>Location: Bangalore, Karnataka, India</p>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom Navigation Link */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-3xl bg-white border border-cm-border text-xs">
          <div>
            <p className="font-bold text-cm-black">Want to review our rental terms?</p>
            <p className="text-cm-muted text-2xs">Understand rental duration, handover inspections, and damage assessment policies.</p>
          </div>
          <Link
            to="/terms"
            className="px-5 py-2.5 rounded-full bg-cm-black text-white font-bold hover:bg-neutral-800 transition flex items-center gap-1.5 shrink-0"
          >
            <span>Read Terms & Conditions</span>
            <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </div>
  );
}
