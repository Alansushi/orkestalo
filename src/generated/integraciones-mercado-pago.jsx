import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

    const { useState } = React;

    const CONFIG = { marca: "Orkesta", whatsapp: "525549713262", email: "info@orkestalo.com" };

    const TRANSLATIONS = {
      es: {
        htmlLang: "es",
        meta: {
          title: "Integraciones de Mercado Pago — Orkesta | Cobros y conciliación automática",
          desc: "Integración de Mercado Pago con tu operación: checkout, links, suscripciones, Point, conciliación automática con ERP/sheets, notificaciones y reportes en tiempo real.",
        },
        waDefault: "Hola, quiero integrar Mercado Pago a mi operación.",
        nav: {
          links: [
            ["Soluciones", "/#soluciones"],
            ["Servicios",  "/#servicios"],
            ["Casos",      "/casos-de-uso.html"],
            ["FAQs",       "/preguntas-frecuentes.html"],
            ["Precios",    "/#precios"],
            ["Contacto",   "/#contacto"],
          ],
          cta: "Agenda una charla",
          menuLabel: "Menú",
        },
        hero: {
          kicker: "Servicio · Integraciones de Mercado Pago",
          h1: '<em>Mercado Pago</em> conectado a tu operación, sin captura manual.',
          lead: 'Integramos <b>checkout</b>, <b>links de pago</b>, <b>Point</b> y <b>suscripciones</b> de Mercado Pago con tu ERP, hoja o CRM. Cada venta queda registrada y conciliada en tiempo real — cero captura manual, cero discrepancias el lunes por la mañana.',
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        capabilities: {
          kicker: "Qué integramos",
          title: 'Toda la operación de pagos, <em>de principio a fin</em>.',
          desc: "Desde el momento del cobro hasta la conciliación contable. Sin cajas negras ni \"magia\": cada paso queda documentado y trazable.",
          items: [
            { iconId: "i-integra", t: "Checkout, links y suscripciones",      d: "Checkout web embebido o redirect, links de pago dinámicos para WhatsApp/correo, y suscripciones recurrentes con manejo de fallos de cobro." },
            { iconId: "i-auto",    t: "Mercado Pago Point (in-store)",         d: "Cobros con terminal física Point conectados a tu sistema de inventario o POS. Cada venta dispara stock y registro contable." },
            { iconId: "i-flujo",   t: "Conciliación automática",               d: "Webhooks de MP cruzados en tiempo real con ventas del ERP/sheet. Discrepancias marcadas el día que ocurren, no una semana después." },
            { iconId: "i-chat",    t: "Notificaciones, refunds y reportes",   d: "Confirmaciones automáticas por WhatsApp/correo, refunds vía API sin contactar soporte, y dashboard live de ventas con corte por canal." },
          ],
        },
        compare: {
          kicker: "Comparativa · Manual vs integrado",
          title: 'Procesar pagos a mano <em>vs.</em> conciliación automática.',
          desc: "El costo real de la conciliación manual no es el tiempo — son los errores que descubrís tarde y las decisiones que tomás con datos incompletos.",
          leftLabel: "Procesar pagos a mano",
          leftTitle: "Descargar extracto, cruzar en Excel",
          rightLabel: "Con Orkesta · MP integrado",
          rightTitle: "Cobros conciliados al ocurrir",
          sin: [
            "Descargar extracto MP los lunes y cruzar con ventas a mano.",
            "Errores de matching: pagos parciales, devoluciones, comisiones cambiantes.",
            "Inconsistencias detectadas días o semanas después.",
            "Sin notificaciones al cliente: dudas sobre si llegó el pago.",
          ],
          con: [
            "Cada transacción se registra automáticamente al ocurrir vía webhook.",
            "Comisiones, refunds y disputas se manejan con reglas, no a ojo.",
            "Dashboard live con corte por canal, sucursal o vendedor.",
            "Confirmación automática al cliente por WhatsApp o correo al cobrar.",
          ],
        },
        cta: {
          title: '¿Tu equipo <em>concilia Mercado Pago</em> el lunes en la mañana?',
          desc: "30 minutos sin compromiso. Te decimos qué partes de tu flujo MP se pueden automatizar primero, qué requiere webhooks vs reconciliación batch, y cuánto se demora la implementación.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        footer: { tagline: "Automatización e IA", country: "Trabajo remoto" },
      },
      en: {
        htmlLang: "en",
        meta: {
          title: "Mercado Pago integrations — Orkesta | Payments & automatic reconciliation",
          desc: "Mercado Pago integration with your operation: checkout, links, subscriptions, Point, automatic reconciliation with ERP/sheets, notifications and real-time reports.",
        },
        waDefault: "Hi, I want to integrate Mercado Pago into my operation.",
        nav: {
          links: [
            ["Solutions", "/#soluciones"],
            ["Services",  "/#servicios"],
            ["Cases",     "/casos-de-uso.html"],
            ["FAQs",      "/preguntas-frecuentes.html"],
            ["Pricing",   "/#precios"],
            ["Contact",   "/#contacto"],
          ],
          cta: "Schedule a call",
          menuLabel: "Menu",
        },
        hero: {
          kicker: "Service · Mercado Pago integrations",
          h1: "<em>Mercado Pago</em> connected to your operation, with no manual capture.",
          lead: "We integrate <b>checkout</b>, <b>payment links</b>, <b>Point</b> and <b>subscriptions</b> from Mercado Pago with your ERP, sheet or CRM. Every sale is logged and reconciled in real time — zero data entry, zero Monday-morning discrepancies.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Book a diagnostic",
        },
        capabilities: {
          kicker: "What we integrate",
          title: "The entire payment operation, <em>end-to-end</em>.",
          desc: "From the moment of payment to accounting reconciliation. No black boxes or \"magic\": every step is documented and traceable.",
          items: [
            { iconId: "i-integra", t: "Checkout, links & subscriptions",          d: "Embedded or redirect web checkout, dynamic payment links for WhatsApp/email, and recurring subscriptions with payment-failure handling." },
            { iconId: "i-auto",    t: "Mercado Pago Point (in-store)",            d: "Payments via Point physical terminal connected to your inventory or POS system. Each sale triggers stock and accounting records." },
            { iconId: "i-flujo",   t: "Automatic reconciliation",                  d: "MP webhooks matched in real time with ERP/sheet sales. Discrepancies flagged the day they happen, not a week later." },
            { iconId: "i-chat",    t: "Notifications, refunds and reports",       d: "Automatic confirmations via WhatsApp/email, refunds via API without contacting support, and live sales dashboard with breakdown by channel." },
          ],
        },
        compare: {
          kicker: "Comparison · Manual vs integrated",
          title: "Processing payments by hand <em>vs.</em> automatic reconciliation.",
          desc: "The real cost of manual reconciliation isn't time — it's the errors you discover late and the decisions you make with incomplete data.",
          leftLabel: "Processing payments by hand",
          leftTitle: "Download statement, cross-check in Excel",
          rightLabel: "With Orkesta · MP integrated",
          rightTitle: "Payments reconciled as they happen",
          sin: [
            "Download MP statement on Mondays and cross-reference with sales by hand.",
            "Matching errors: partial payments, refunds, changing fees.",
            "Inconsistencies detected days or weeks later.",
            "No customer notifications: doubts about whether payment arrived.",
          ],
          con: [
            "Each transaction is logged automatically when it happens via webhook.",
            "Fees, refunds and disputes are handled with rules, not by eye.",
            "Live dashboard with breakdown by channel, branch or salesperson.",
            "Automatic confirmation to the customer via WhatsApp or email upon payment.",
          ],
        },
        cta: {
          title: "Does your team <em>reconcile Mercado Pago</em> on Monday morning?",
          desc: "30 minutes no commitment. We tell you which parts of your MP flow can be automated first, what needs webhooks vs batch reconciliation, and how long implementation takes.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Book a diagnostic",
        },
        footer: { tagline: "Automation & AI", country: "Remote collaboration" },
      },
    };

    function detectLanguage() {
      try {
        const param = new URLSearchParams(window.location.search).get('lang');
        if (param === 'en' || param === 'es') return param;
        const stored = localStorage.getItem('orkesta-lang');
        if (stored === 'en' || stored === 'es') return stored;
        const browser = (navigator.language || 'es').slice(0, 2);
        return browser === 'en' ? 'en' : 'es';
      } catch { return 'es'; }
    }

    const waLink = (msg, lang = 'es') =>
      `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg || TRANSLATIONS[lang].waDefault)}`;

    const Ico = ({ id, w = 18, h = 18 }) => (
      <svg width={w} height={h} aria-hidden="true"><use href={`/defs.svg#${id}`}/></svg>
    );

    const Nav = ({ lang, setLanguage, t }) => {
      const [open, setOpen] = useState(false);
      return (
        <header className="nav-bar nav-bar--green">
          <div className="nav-inner">
            <a href="/" className="nav-logo">
              <svg width="34" height="34"><use href="/defs.svg#mark"/></svg>
              <span className="nav-wordmark">{CONFIG.marca}</span>
            </a>
            <nav className="nav-links">
              {t.links.map(([label, href]) => <a key={href} href={href} className="nav-link">{label}</a>)}
              <div className="lang-toggle">
                <button className={`lang-btn${lang === 'es' ? ' active' : ''}`} onClick={() => setLanguage('es')}>ES</button>
                <span className="lang-sep">/</span>
                <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLanguage('en')}>EN</button>
              </div>
              <a href="/#contacto" className="btn btn-primary nav-cta">{t.cta}</a>
            </nav>
            <button onClick={() => setOpen(!open)} className="nav-toggle" aria-label={t.menuLabel}>
              <span/><span/><span/>
            </button>
          </div>
          {open && (
            <div className="nav-mobile">
              <div className="lang-mobile">
                <button className={`lang-btn${lang === 'es' ? ' active' : ''}`} onClick={() => { setLanguage('es'); setOpen(false); }}>ES</button>
                <span className="lang-sep">/</span>
                <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => { setLanguage('en'); setOpen(false); }}>EN</button>
              </div>
              {t.links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
            </div>
          )}
        </header>
      );
    };

    const PageHero = ({ t, lang }) => (
      <section id="top" className="page-hero">
        <div className="wrap">
          <span className="badge badge-green hero-kicker"><Ico id="i-integra" w={13} h={13}/>{t.kicker}</span>
          <h1 dangerouslySetInnerHTML={{ __html: t.h1 }} />
          <p className="lead" dangerouslySetInnerHTML={{ __html: t.lead }} />
          <div className="ctas">
            <a href={waLink(null, lang)} target="_blank" className="btn btn-green"><Ico id="i-wa" w={20} h={20}/>{t.ctaWA}</a>
            <a href="/#contacto" className="btn btn-primary"><Ico id="i-cal" w={18} h={18}/>{t.ctaAgendar}</a>
          </div>
        </div>
      </section>
    );

    const Capabilities = ({ t }) => (
      <section id="capabilities" className="section">
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <div className="svc-grid">
            {t.items.map(c => (
              <div key={c.t} className="svc-card">
                <div className="svc-ico"><Ico id={c.iconId} w={26} h={26}/></div>
                <div className="svc-title">{c.t}</div>
                <p className="svc-desc">{c.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    const Compare = ({ t }) => (
      <section id="compare" className="section" style={{background:"var(--paper-2)"}}>
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <div className="compare-grid">
            <div className="compare-col">
              <div className="compare-label">{t.leftLabel}</div>
              <h3 className="compare-title">{t.leftTitle}</h3>
              <ul className="compare-list">
                {t.sin.map(item => (
                  <li key={item} className="compare-item">
                    <svg className="compare-item-ico"><use href="/defs.svg#i-arrow"/></svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="compare-col compare-col--orkesta">
              <div className="compare-label">{t.rightLabel}</div>
              <h3 className="compare-title">{t.rightTitle}</h3>
              <ul className="compare-list">
                {t.con.map(item => (
                  <li key={item} className="compare-item">
                    <svg className="compare-item-ico"><use href="/defs.svg#i-check"/></svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    );

    const CtaFinal = ({ t, lang }) => (
      <section className="section">
        <div className="wrap">
          <div className="cta-block">
            <h2 dangerouslySetInnerHTML={{ __html: t.title }} />
            <p>{t.desc}</p>
            <div className="ctas">
              <a href={waLink(null, lang)} target="_blank" className="btn"><Ico id="i-wa" w={20} h={20}/>{t.ctaWA}</a>
              <a href="/#contacto" className="btn btn-ghost"><Ico id="i-cal" w={18} h={18}/>{t.ctaAgendar}</a>
            </div>
          </div>
        </div>
      </section>
    );

    const Footer = ({ t }) => (
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {CONFIG.marca} · {t.tagline} · {t.country} · <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a></span>
        <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
      </footer>
    );

    const FloatingWA = ({ lang }) => (
      <a href={waLink(null, lang)} target="_blank" aria-label="WhatsApp" className="floating-wa">
        <Ico id="i-wa" w={22} h={22}/>
        <span className="floating-wa-text">WhatsApp</span>
      </a>
    );

    const App = () => {
      const [lang, setLang] = useState(detectLanguage);
      const t = TRANSLATIONS[lang];

      React.useEffect(() => {
        document.documentElement.lang = t.htmlLang;
        document.title = t.meta.title;
        const update = (sel, attr, val) => {
          const el = document.querySelector(sel);
          if (el) el.setAttribute(attr, val);
        };
        update('meta[name="description"]', 'content', t.meta.desc);
        update('meta[property="og:title"]', 'content', t.meta.title);
        update('meta[property="og:description"]', 'content', t.meta.desc);
        update('meta[name="twitter:title"]', 'content', t.meta.title);
        update('meta[name="twitter:description"]', 'content', t.meta.desc);
      }, [lang]);

      const setLanguage = (l) => {
        setLang(l);
        try { localStorage.setItem('orkesta-lang', l); } catch {}
        try {
          const url = new URL(window.location);
          if (l === 'en') url.searchParams.set('lang', 'en');
          else url.searchParams.delete('lang');
          window.history.replaceState({}, '', url);
        } catch {}
      };

      return (
        <div>
          <Nav lang={lang} setLanguage={setLanguage} t={t.nav} />
          <main>
            <PageHero t={t.hero} lang={lang} />
            <Capabilities t={t.capabilities} />
            <Compare t={t.compare} />
            <CtaFinal t={t.cta} lang={lang} />
          </main>
          <Footer t={t.footer} />
          <FloatingWA lang={lang} />
        </div>
      );
    };

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  