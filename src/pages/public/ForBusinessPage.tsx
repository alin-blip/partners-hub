import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { CheckCircle, DollarSign, Handshake, Lightbulb, Building2, Briefcase, Scale, Users } from "lucide-react";

export default function ForBusinessPage() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Nav */}
      <nav className="absolute top-0 inset-x-0 z-20 px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-[#D4AF37] font-bold tracking-tight">
          <span className="text-xl">EduForYou</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/60">UK</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-white/70 hover:text-white">Sign in</Link>
          <Button asChild className="bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 rounded-full">
            <Link to="/apply-partner">Become a Partner</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center px-6 pt-24 pb-16 overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(212,175,55,0.25), transparent 50%), radial-gradient(circle at 80% 70%, rgba(212,175,55,0.15), transparent 60%)",
          }}
        />
        <div className="relative z-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center w-full">
          <div className="space-y-6">
            <span className="inline-block text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-semibold">
              For Businesses
            </span>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Add a revenue stream <span className="text-[#D4AF37]">without lifting a finger.</span>
            </h1>
            <p className="text-lg text-white/70 max-w-lg">
              Turn your existing network — clients, employees, foot traffic — into recurring income.
              We handle every step of UK university admissions and student finance. You just refer.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 rounded-full px-7">
                <Link to="/apply-partner">Apply to become a partner</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 rounded-full px-7 bg-transparent">
                <a href="#how">How it works</a>
              </Button>
            </div>
            <div className="flex items-center gap-6 pt-6 text-white/50 text-sm">
              <span>£0 setup</span>
              <span>•</span>
              <span>Recurring per-student commissions</span>
              <span>•</span>
              <span>Live in 48h</span>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-square rounded-3xl bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border border-[#D4AF37]/20 p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#0A1628] font-bold">
                    £
                  </div>
                  <div>
                    <p className="text-xs text-white/50 uppercase tracking-wider">Estimated yearly</p>
                    <p className="text-3xl font-bold">£42,000+</p>
                  </div>
                </div>
                <p className="text-white/60 text-sm">From a network of 200 referrals at average commission rates.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white/5 rounded-xl py-3"><p className="text-xl font-bold text-[#D4AF37]">100+</p><p className="text-[10px] uppercase tracking-wider text-white/40">UK Unis</p></div>
                <div className="bg-white/5 rounded-xl py-3"><p className="text-xl font-bold text-[#D4AF37]">10k+</p><p className="text-[10px] uppercase tracking-wider text-white/40">Enrolled</p></div>
                <div className="bg-white/5 rounded-xl py-3"><p className="text-xl font-bold text-[#D4AF37]">500+</p><p className="text-[10px] uppercase tracking-wider text-white/40">Partners</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section id="how" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Why partner with EduForYou</h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-16">
            One platform. Every tool. Zero friction. Designed for UK businesses with reach.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueProp icon={<DollarSign />} title="Monetise your network" description="Email lists, foot traffic, repeat clients — turn warm contacts into recurring revenue." />
            <ValueProp icon={<Handshake />} title="Zero investment" description="No setup fees, no hires, no training overhead. Start earning the day you sign." />
            <ValueProp icon={<CheckCircle />} title="We do the work" description="Admissions, paperwork, student finance. Your team only refers." />
            <ValueProp icon={<Lightbulb />} title="Recurring cashflow" description="Per-student commissions paid automatically. Predictable monthly income." />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Built for any UK business</h2>
          <p className="text-white/60 text-center max-w-2xl mx-auto mb-16">
            One agency or 50 branches. Same platform. Same simple dashboard.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PartnerType icon={<Users />} title="Staffing agencies" />
            <PartnerType icon={<Briefcase />} title="Accounting firms" />
            <PartnerType icon={<Scale />} title="Law practices" />
            <PartnerType icon={<Building2 />} title="Multi-branch businesses" />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-12">
          <h2 className="text-4xl font-bold">Our impact in numbers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <Stat value="500+" label="Active partners" />
            <Stat value="10,000+" label="Students enrolled" />
            <Stat value="100+" label="UK universities" />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto bg-gradient-to-br from-[#D4AF37]/15 to-transparent border border-[#D4AF37]/20 rounded-3xl p-12 text-center space-y-6">
          <h2 className="text-4xl font-bold">Ready to grow your business?</h2>
          <p className="text-lg text-white/70">Apply in 2 minutes. We review and onboard within 48 hours.</p>
          <Button asChild size="lg" className="bg-[#D4AF37] text-[#0A1628] hover:bg-[#D4AF37]/90 rounded-full px-10">
            <Link to="/apply-partner">Apply to become a partner</Link>
          </Button>
        </div>
      </section>

      <footer className="py-10 px-6 border-t border-white/5 text-center text-white/40 text-sm">
        <p>&copy; {new Date().getFullYear()} EduForYou UK. All rights reserved.</p>
      </footer>
    </div>
  );
}

function ValueProp({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3 hover:border-[#D4AF37]/40 transition-colors">
      <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-white/60 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function PartnerType({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex items-center gap-3">
      <div className="text-[#D4AF37]">{icon}</div>
      <p className="font-medium">{title}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-5xl md:text-6xl font-extrabold text-[#D4AF37]">{value}</p>
      <p className="mt-2 text-white/60 uppercase tracking-wider text-xs">{label}</p>
    </div>
  );
}
