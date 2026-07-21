import { useState } from 'react';
import {
  Sun, Moon, ArrowUp, ArrowRight, Loader2, ChevronRight, Plus, Check,
  ScanSearch, Library, ShieldCheck, LayoutGrid, Gauge, ClipboardCheck, GitBranch, Cpu, KeyRound,
} from 'lucide-react';
import { Logo } from './Logo.jsx';
import { Showcase } from './Showcase.jsx';
import { getApiKey } from '../lib/api.js';
import './landing.css';

const CHIPS = [
  'a scalable e-commerce platform with payments, search and analytics',
  'a realtime chat app like WhatsApp with group messaging',
  'a ride-sharing app with driver matching and live tracking',
  'an AI support chatbot that answers from our docs using RAG',
];

const STEPS = [
  { n: '01', icon: ScanSearch, h: 'Understand', p: 'Detects the capabilities your prompt asks for — payments, realtime, search, ML.' },
  { n: '02', icon: Library, h: 'Ground', p: 'Matches proven reference architectures for every facet, so the design is real, not generic.' },
  { n: '03', icon: ShieldCheck, h: 'Verify', p: 'Checks every box and edge against real principles. Illegal wiring is auto-fixed.' },
  { n: '04', icon: LayoutGrid, h: 'Lay out', p: 'Clean layered diagram with capacity math and a Well-Architected review.' },
];

const FEATURES = [
  { icon: ShieldCheck, h: 'Correctness, guaranteed', p: 'Layer call-rules, database-per-service, single-point-of-failure and protocol checks run as code — not left to the model. Illegal connections are re-routed or reversed automatically.', metric: 'every diagram verified' },
  { icon: Gauge, h: 'Capacity, estimated', p: 'QPS, storage, bandwidth, cache size and instance count — deterministic back-of-the-envelope math from your assumptions.' },
  { icon: ClipboardCheck, h: 'Well-Architected review', p: 'Scored across the six AWS pillars with the specific gaps called out — reliability, performance, security, cost, operations, sustainability.' },
  { icon: GitBranch, h: 'Every element explained', p: 'A concrete reason on every component and connection. Real tech names, never a vague "database".' },
];

const BENCH_REAL = ['API Gateway (RTAPI)', 'Matching / Dispatch', 'Location tracking', 'Kafka event streaming', 'Geohash geo-index', 'Cassandra / Postgres', 'Payments', 'Observability'];
const BENCH_AF = ['API Gateway · Envoy', 'Matching Service', 'Location Service', 'Location Stream · Kafka', 'Geo Index · Redis geohash', 'Trip DB · PostgreSQL', 'Payment Gateway · Stripe', 'ELK + Prometheus + Jaeger'];

const GALLERY = [
  { dom: 'fintech', h: 'Digital wallet & banking', p: 'Accounts, transfers, an immutable ledger and real-time fraud detection.', prompt: 'a digital banking app with accounts, money transfers, an immutable ledger and fraud detection' },
  { dom: 'video-streaming', h: 'Video streaming', p: 'Upload, transcode and stream to a global audience over a CDN.', prompt: 'a video streaming platform like YouTube with upload and transcoding' },
  { dom: 'food-delivery', h: 'Food delivery', p: 'Restaurant search, orders, payments and live courier tracking.', prompt: 'a food delivery app with restaurant search, orders, payments and live courier tracking' },
  { dom: 'collaborative', h: 'Collaborative editor', p: 'Realtime multi-user document editing with conflict-free merges.', prompt: 'a collaborative document editor like Google Docs with realtime editing' },
  { dom: 'iot', h: 'IoT telemetry', p: 'High-frequency sensor ingestion, time-series storage and alerting.', prompt: 'an IoT platform ingesting sensor telemetry with time-series storage and alerting' },
  { dom: 'analytics', h: 'Analytics pipeline', p: 'Clickstream events into a warehouse with dashboards.', prompt: 'a realtime analytics platform for clickstream events with a data warehouse and dashboards' },
];

const FAQS = [
  { q: 'How is this more accurate than other AI diagram tools?', a: 'Accuracy is engineered, not hoped for. The model reasons against a curated library of real reference architectures, produces several candidates, and each is checked against a data-driven principle registry. Illegal connections are auto-fixed and the best candidate is picked by that verifier — so no diagram ships invalid.' },
  { q: 'Does it produce real, production-grade designs?', a: 'Yes. Even a "simple" prompt like a URL shortener yields the full production system — CDN, load balancer, cache, partitioned datastore, async processing, auth and observability — the way a large company actually runs it. We benchmarked it against Uber and Netflix’s published architectures and it matched the core patterns.' },
  { q: 'What does it cost to run?', a: 'It runs on a free tier. Reasoning uses Groq (Llama 3.3 70B) with a Gemini fallback — both free. Layout, verification and capacity math are deterministic and run locally.' },
  { q: 'Can I trust the capacity numbers?', a: 'They are exact arithmetic — QPS from daily active users and actions, storage from write rate and retention, cache from the working set. No model is involved in the math, so the numbers are reproducible.' },
];

export function Landing({ onRun, status, error, theme, toggle, providers, onOpenKeys }) {
  const [prompt, setPrompt] = useState('');
  const loading = status === 'loading';
  const autogrow = (el) => { if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; } };
  const submit = (text) => { const t = (text ?? prompt).trim(); if (t.length >= 3 && !loading) { setPrompt(t); onRun(t); } };

  return (
    <div className="landing">
      {/* Nav */}
      <header className="header">
        <Logo />
        <nav className="nav-links">
          <a href="#how" className="nav-hide">How it works</a>
          <a href="#features" className="nav-hide">Features</a>
          <a href="#gallery" className="nav-hide">Examples</a>
          <a href="#faq" className="nav-hide">FAQ</a>
          {providers?.length > 0 && <span className="provider-dot nav-hide"><span className="dot" /> {providers.join(' · ')}</span>}
          {onOpenKeys && (
            <button className={`icon-btn${getApiKey() ? ' on' : ''}`} onClick={onOpenKeys} aria-label="Your API key" title={getApiKey() ? 'Your API key (active)' : 'Use your own API key'}>
              <KeyRound size={16} />
            </button>
          )}
          <button className="icon-btn" onClick={toggle} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}</button>
        </nav>
      </header>

      {/* Hero + live demo */}
      <section className="hero" style={{ flex: 'none', minHeight: 'auto', paddingTop: '9vh', paddingBottom: '28px', gap: '22px' }}>
        <span className="hero-eyebrow"><b>Verified</b> · not just drawn</span>
        <h1>From a sentence to a system <br />that <em>actually holds up</em></h1>
        <p className="hero-sub">
          Describe what you want to build. ArchForge designs a production-grade architecture —
          verified against real system-design principles, with capacity estimates and a
          Well-Architected review.
        </p>
        <div className="prompt">
          <textarea
            value={prompt}
            placeholder="e.g. a scalable ride-sharing app with driver matching, live tracking and payments"
            onChange={(e) => { setPrompt(e.target.value); autogrow(e.target); }}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit(); }}
            rows={1} autoFocus
          />
          <div className="prompt-row">
            <span className="prompt-hint">⌘↵ to generate</span>
            <button className="btn-primary" onClick={() => submit()} disabled={prompt.trim().length < 3 || loading}>
              {loading ? <><Loader2 size={15} className="spin" /> Designing…</> : <>Generate <ArrowUp size={15} /></>}
            </button>
          </div>
        </div>
        {status === 'error' && <div className="error-note">{error}</div>}
        <div className="chips">
          {CHIPS.map((c) => <button key={c} className="chip" onClick={() => submit(c)}>{c.replace(/^a[n]? /, '')}</button>)}
        </div>
        <div className="trust">
          <span><ShieldCheck size={15} /> Correctness verified</span>
          <span><Gauge size={15} /> Capacity estimated</span>
          <span><GitBranch size={15} /> Every box &amp; edge explained</span>
        </div>

        <Showcase />
      </section>

      {/* Proof strip */}
      <div className="proof">
        <span className="proof-label">Matches how the best actually build</span>
        <div className="proof-names">
          <span>Uber</span><span>Netflix</span><span>Instagram</span><span>Stripe</span><span>Airbnb</span><span>Dropbox</span>
        </div>
      </div>

      <div className="divider" />

      {/* How it works */}
      <section className="section" id="how">
        <div className="section-head center">
          <div className="kicker">How it works</div>
          <h2>Four stages between your prompt and a diagram you can trust</h2>
        </div>
        <div className="pipeline">
          {STEPS.map((s, i) => (
            <div className="pstep" key={s.n} style={{ animationDelay: `${i * 90}ms` }}>
              <div className="pstep-num">{s.n}</div>
              <div className="pstep-ico"><s.icon size={20} /></div>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
              {i < STEPS.length - 1 && <ChevronRight size={18} className="pstep-flow" />}
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <div className="section-head">
          <div className="kicker">Why it&apos;s trustworthy</div>
          <h2>Accuracy is engineered in, not hoped for</h2>
          <p>Three layers of defense turn a language model into a correctness instrument.</p>
        </div>
        <div className="features">
          {FEATURES.map((f, i) => (
            <div className={`feat${i === 0 ? ' hero-feat' : ''}`} key={f.h}>
              <div className="feat-ico"><f.icon size={22} /></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
                {f.metric && <span className="feat-metric">{f.metric}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Benchmark */}
      <section className="section" id="benchmark">
        <div className="bench">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div className="kicker">Benchmarked against reality</div>
            <h2>It matches how the biggest companies actually build</h2>
            <p>Given only the words &ldquo;a ride-sharing platform like Uber,&rdquo; ArchForge independently produced Uber&apos;s real, published architecture.</p>
          </div>
          <div className="bench-grid">
            <div className="bench-col">
              <h4>Uber&apos;s published architecture</h4>
              <div className="sub">from Uber Engineering &amp; High Scalability</div>
              <ul className="bench-list">{BENCH_REAL.map((x) => <li key={x}><Cpu size={14} /> {x}</li>)}</ul>
            </div>
            <div className="bench-col">
              <h4>ArchForge, from one sentence</h4>
              <div className="sub">generated · verified · 15 components</div>
              <ul className="bench-list">{BENCH_AF.map((x) => <li key={x}><Check size={14} /> {x}</li>)}</ul>
            </div>
          </div>
          <div className="bench-verdict"><ShieldCheck size={18} style={{ color: 'var(--success)' }} /> <span><b>All core patterns matched</b> — gateway, matching, geohash geo-index, Kafka streaming and full observability.</span></div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section" id="gallery">
        <div className="section-head center">
          <div className="kicker">Try one</div>
          <h2>From fintech to IoT — click to generate</h2>
        </div>
        <div className="gallery">
          {GALLERY.map((g) => (
            <button className="gcard" key={g.dom} onClick={() => submit(g.prompt)}>
              <div className="gcard-dom mono">{g.dom}</div>
              <h4>{g.h}</h4>
              <p>{g.p}</p>
              <span className="gcard-go">Generate <ArrowRight size={14} /></span>
            </button>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-narrow" id="faq">
        <div className="section-head center"><div className="kicker">Questions</div><h2>Good to know</h2></div>
        <FAQList items={FAQS} />
      </section>

      {/* CTA */}
      <section className="cta">
        <h2>Design something that holds up.</h2>
        <p>One sentence in. A verified, production-grade architecture out.</p>
        <button className="btn-primary" style={{ padding: '11px 20px', fontSize: 15 }} onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          Start designing <ArrowUp size={16} />
        </button>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <Logo />
          <div className="footer-links"><a href="#how">How it works</a><a href="#features">Features</a><a href="#faq">FAQ</a></div>
          <span>Runs free on Groq + Gemini · built for engineers</span>
        </div>
      </footer>

      <style>{`.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.spin{animation:none}}`}</style>
    </div>
  );
}

function FAQList({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq">
      {items.map((it, i) => (
        <div className={`faq-item${open === i ? ' open' : ''}`} key={i}>
          <button className="faq-q" onClick={() => setOpen(open === i ? -1 : i)}>{it.q}<Plus size={18} /></button>
          <div className="faq-a"><p>{it.a}</p></div>
        </div>
      ))}
    </div>
  );
}
