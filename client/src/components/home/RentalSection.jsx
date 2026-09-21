import { Calendar, PackageCheck, RotateCcw, ArrowRight } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import Badge from "../common/Badge";

const RENTAL_STEPS = [
  {
    step: "01",
    icon: Calendar,
    title: "Pick Dates & Rent",
    desc: "Choose a 3, 7, or 14-day rental window. Pay a fraction of the retail price with refundable deposit."
  },
  {
    step: "02",
    icon: PackageCheck,
    title: "Flaunt Your Fit",
    desc: "Your designer or festive outfit arrives freshly dry-cleaned and ready to wear for your event."
  },
  {
    step: "03",
    icon: RotateCcw,
    title: "Easy Doorstep Return",
    desc: "Place the item back in the reusable bag. Our agent picks it up free of cost, and deposit is refunded instantly."
  }
];

export default function RentalSection({ onSelectRental }) {
  return (
    <section className="cm-section bg-white border-b border-cm-border">
      <div className="cm-container">
        <SectionHeader
          eyebrow="CIRCULAR RENTAL CLOSET"
          title="Rent High-Fashion for 80% Less"
          description="Wear premium designer outfits for weddings, college fests, or photoshoots without buying or cluttering your wardrobe."
        />

        {/* 3-Step Modern Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative mb-16">
          {RENTAL_STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-cm-soft border border-cm-border rounded-3xl p-8 space-y-4 relative group hover:border-cm-black transition-all duration-300 shadow-sm"
              >
                <div className="flex justify-between items-center">
                  <div className="w-12 h-12 rounded-2xl bg-cm-black text-white flex items-center justify-center font-bold">
                    <Icon size={22} />
                  </div>
                  <span className="font-display font-bold text-3xl text-cm-border group-hover:text-cm-red transition-colors">
                    {item.step}
                  </span>
                </div>

                <h3 className="font-display font-bold text-xl text-cm-black pt-2">
                  {item.title}
                </h3>
                <p className="text-sm text-cm-muted leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Rent vs Buy Comparison Box */}
        <div className="bg-cm-soft border border-cm-border rounded-3xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-2 text-left max-w-lg">
            <Badge variant="rent">SAVINGS COMPARISON</Badge>
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-cm-black">
              Why buy a ₹10,000 Kurti when you can rent it for ₹299?
            </h3>
            <p className="text-sm text-cm-muted">
              Zero dry cleaning hassle, zero maintenance cost, 100% fresh style for every single occasion.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => onSelectRental?.()}
              className="btn btn-primary py-3.5 px-8 text-sm flex items-center gap-2"
            >
              <span>Explore Rental Closet</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
