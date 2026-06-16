import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, ClipboardCheck, FileText, ShieldCheck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";

const features = [
  { icon: ClipboardCheck, title: "Work order control", copy: "Create, assign, track, and close CM, PM, and installation work from one operational board." },
  { icon: CalendarClock, title: "Preventive schedules", copy: "Plan recurring maintenance, inspect monthly status, and connect PM tasks back to field execution." },
  { icon: FileText, title: "Field reports", copy: "Generate structured CMMS records with client details, assets, findings, actions, and sign-off." },
  { icon: BarChart3, title: "Live visibility", copy: "See active work, overdue jobs, team workload, completion rate, assets, and reports in one dashboard." }
];

export default function HomePage() {
  return (
    <main className="home-page">
      <nav className="home-nav">
        <Link href="/" className="home-brand">
          <svg className="brand-mark" viewBox="0 0 96 104" role="img" aria-label="SyncShield">
            <path d="M 13 6 L 83 6 Q 91 6 91 14 L 91 60 Q 91 81 48 98 Q 5 81 5 60 L 5 14 Q 5 6 13 6 Z" fill="#00C8D4" />
            <path d="M 62 43 A 19 19 0 0 0 31 62" stroke="#0A1628" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M 34 72 A 19 19 0 0 0 65 53" stroke="#0A1628" strokeWidth="4" fill="none" strokeLinecap="round" />
            <circle cx="48" cy="58" r="3.2" fill="#0A1628" opacity="0.8" />
          </svg>
          <div>
            <div className="brand-name">SYNC<span>SHIELD</span></div>
            <div className="brand-tag">CMMS FIELD OPERATIONS</div>
          </div>
        </Link>
        <div className="home-nav-actions">
          <a href="mailto:contact@syncshield.io">Contact</a>
          <Button asChild variant="teal">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </nav>

      <section className="home-hero">
        <div className="home-copy">
          <div className="home-eyebrow"><ShieldCheck size={16} /> CMMS for field-ready maintenance teams</div>
          <h1>Run maintenance work, reports, assets, and PM schedules with SyncShield.</h1>
          <p>
            SyncShield CMMS gives project managers, engineers, and technicians a focused system for maintenance execution:
            work orders, assigned teams, client records, asset history, report generation, and preventive maintenance visibility.
          </p>
          <div className="home-actions">
            <Button asChild variant="teal" size="lg">
              <Link href="/login">Login to CMMS <ArrowRight size={16} /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="mailto:contact@syncshield.io">Contact SyncShield</a>
            </Button>
          </div>
        </div>
        <div className="home-visual" aria-label="SyncShield CMMS dashboard preview">
          <div className="preview-top">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-kpis">
            <div><b>42</b><span>Work Orders</span></div>
            <div><b>93%</b><span>Readiness</span></div>
            <div><b>8</b><span>PM Due</span></div>
          </div>
          <div className="preview-board">
            <div><strong>Scheduled</strong><p>Quarterly PM</p><p>Radio inspection</p></div>
            <div><strong>In Progress</strong><p>Corrective visit</p><p>Battery test</p></div>
            <div><strong>Completed</strong><p>Installation report</p><p>Client sign-off</p></div>
          </div>
        </div>
      </section>

      <section className="home-features">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <article key={feature.title}>
              <div><Icon size={20} /></div>
              <h2>{feature.title}</h2>
              <p>{feature.copy}</p>
            </article>
          );
        })}
      </section>

      <section className="home-cta">
        <div>
          <Wrench size={26} />
          <h2>Ready to centralize maintenance operations?</h2>
          <p>Contact SyncShield to configure companies, users, roles, work orders, reports, and preventive schedules.</p>
        </div>
        <Button asChild variant="teal" size="lg">
          <a href="mailto:contact@syncshield.io">Contact Us</a>
        </Button>
      </section>
    </main>
  );
}
