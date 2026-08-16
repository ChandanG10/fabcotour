import { Award, Package, ShieldCheck, Truck } from "lucide-react";

const benefits = [
  {
    title: "PREMIUM PRINTS",
    copy: "Vibrant, long-lasting quality",
    icon: Package
  },
  {
    title: "NO MINIMUM ORDER",
    copy: "Order one or one hundred",
    icon: Award
  },
  {
    title: "PAN-INDIA DELIVERY",
    copy: "Fast & reliable shipping",
    icon: Truck
  },
  {
    title: "BULK PRICING",
    copy: "Best value for businesses",
    icon: ShieldCheck
  }
];

export function BenefitStrip() {
  return (
    <section className="hidden rounded-[28px] border border-black/6 bg-white px-4 py-4 shadow-sm md:block md:px-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-black/8">
        {benefits.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-center gap-4 px-2 py-3 xl:px-6">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-yellow/40 bg-brand-yellow/10 text-brand-black">
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-[0.95rem] font-extrabold tracking-[0.04em] text-brand-black">
                  {item.title}
                </p>
                <p className="mt-1 text-sm text-brand-muted">{item.copy}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
