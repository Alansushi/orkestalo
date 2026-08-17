import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

    const { useState } = React;

    const CONFIG = { marca: "Orkesta", whatsapp: "525549713262", email: "info@orkestalo.com" };

    const TRANSLATIONS = {
      es: {
        htmlLang: "es",
        meta: {
          title: "¿Por qué Orkesta? — Automatización n8n y Claude frente a alternativas",
          desc: "Compara Orkesta con freelancers, agencias generalistas y plataformas self-service para proyectos de automatización con n8n y agentes de IA.",
        },
        waDefault: "Hola, quiero saber si Orkesta es la opción correcta para mi negocio.",
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
          kicker: "Comparativa · ¿Por qué Orkesta?",
          h1: 'Automatización con n8n y IA: <em>¿por qué Orkesta?</em>',
          lead: 'Hay muchas formas de automatizar un negocio: plataformas self-service, freelancers técnicos, agencias generalistas. Esta página explica honestamente qué diferencia a Orkesta — y cuándo otra opción puede ser mejor.',
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        differentiators: {
          kicker: "Cuatro diferenciadores",
          title: 'Lo que nos distingue <em>de las demás opciones</em>.',
          items: [
            { iconId: "i-flujo",   t: "Stack open-source, sin lock-in",        d: "Construimos sobre n8n (open-source). El código y los flujos viven en tu infraestructura; no dependes de Orkesta para que sigan funcionando." },
            { iconId: "i-agente",  t: "Automatización + IA en un equipo",       d: "n8n orquesta los flujos y los modelos de IA añaden razonamiento cuando el proceso lo requiere." },
            { iconId: "i-modelo",  t: "Diagnóstico de proceso primero",         d: "Antes de escribir código, mapeamos qué automatizar y cuál entrega más ROI. No vendemos implementaciones por el placer de implementar." },
            { iconId: "i-integra", t: "Soporte continuo incluido",              d: "Entregamos accesos, documentación y handoff completo. El plan de soporte cubre monitoreo, ajustes y nuevas automatizaciones." },
          ],
        },
        compare: {
          kicker: "Comparativa · 4 opciones comunes",
          title: 'Elige la opción que mejor <em>encaja con tu negocio</em>.',
          desc: "No hay una respuesta universal. Aquí está nuestra visión honesta de cada opción — incluyendo cuándo nosotros no somos la mejor elección.",
          headers: ["Aspecto", "Orkesta", "Freelancer técnico", "Agencia generalista", "Self-service (Zapier/Make)"],
          rows: [
            { label: "Stack principal",       values: ["n8n + Claude API (open-source)", "n8n / Make (varía)", "Cualquier stack", "Zapier, Make, Airtable"] },
            { label: "Lock-in",               values: ["Sin lock-in — código tuyo", "Depende del freelancer", "Depende de contratos", "Atado a la plataforma"] },
            { label: "Agentes IA",            values: ["Integrados cuando el proceso lo requiere", "Confirmar experiencia y alcance", "Confirmar experiencia y alcance", "Funciones según la plataforma"] },
            { label: "Soporte continuo",      values: ["Plan mensual incluido", "Variable, disponibilidad limitada", "SLA formal, mayor costo", "Soporte de plataforma"] },
            { label: "Acompañamiento cercano",   values: ["Sí — trabajo directo y claro", "Variable", "Más orientado a grandes organizaciones", "Sí, self-service"] },
            { label: "Diagnóstico inicial",   values: ["Gratuito, 30 min", "Consulta pagada o gratis", "Proceso largo de venta", "Prueba gratuita"] },
          ],
        },
        when: {
          kicker: "Honestidad ante todo",
          title: '¿Cuándo <em>no</em> elegir Orkesta?',
          desc: "Creemos en la claridad. Hay casos en los que otra opción es mejor para ti:",
          items: [
            { t: "Si quieres manejar la herramienta tú mismo",   d: "Zapier o Make son buenas opciones self-service. No necesitas consultora si tienes tiempo de aprender y los flujos son simples." },
            { t: "Si tienes un equipo técnico interno",           d: "Si ya tienes ingenieros que manejan n8n, probablemente lo que necesitas es revisión de arquitectura, no un servicio administrado." },
            { t: "Si el proyecto es de gran escala (+50 flujos)",     d: "Para implementaciones de gran escala con equipos de 100+, una agencia más grande con SLA formal puede ser más adecuada." },
            { t: "Si el presupuesto es muy ajustado",             d: "Hay freelancers técnicos capaces con tarifas más bajas. Si no somos la opción correcta para tu presupuesto, te lo decimos." },
          ],
        },
        faqs: {
          kicker: "Preguntas frecuentes",
          title: 'Dudas comunes antes de <em>elegir consultora</em>.',
          items: [
            { q: "¿Por qué n8n y Claude juntos en lugar de solo n8n?", a: "n8n orquesta flujos y conecta sistemas; Claude añade razonamiento. Los pasos que requieren decisión, interpretación de documentos o conversación natural necesitan un modelo de lenguaje. Juntos cubren tanto la automatización estructurada como los pasos que requieren IA." },
            { q: "¿Qué diferencia a Orkesta de un freelancer de n8n?", a: "Un freelancer técnico implementa lo que le pides. Orkesta empieza por el diagnóstico de proceso — qué automatizar primero, cuál entrega más ROI — y entrega con documentación, testing y soporte continuo. No solo construimos el flujo; aseguramos que funcione en producción." },
            { q: "¿Podemos trabajar de forma remota?", a: "Sí. Colaboramos de forma remota por WhatsApp, correo y videollamada, con seguimiento claro en cada etapa." },
            { q: "¿Qué pasa con mi automatización si dejo de trabajar con Orkesta?", a: "El código vive en tu infraestructura (tu instancia de n8n, tus credenciales de Claude API). Entregamos accesos, contraseñas y documentación. No dependes de nosotros para que siga funcionando." },
            { q: "¿Cuánto tiempo tarda una implementación?", a: "El tiempo se define después del diagnóstico, según sistemas, excepciones y controles requeridos. La propuesta incluye un calendario concreto antes de iniciar." },
            { q: "¿Pueden trabajar con el software que ya uso?", a: "Sí. n8n conecta con más de 400 apps vía nodos nativos y cualquier sistema con API REST o webhooks. Si ya usas HubSpot, Salesforce, Zoho, SAP, sistemas propietarios o APIs internas, podemos integrarlos." },
          ],
        },
        cta: {
          title: '¿Listo para comparar <em>con tu caso real</em>?',
          desc: "30 minutos sin compromiso. Te mostramos qué automatizaciones tienen más ROI para tu negocio y qué opción encaja mejor con tu situación — aunque no seamos nosotros.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        footer: { tagline: "Automatización e IA", country: "Trabajo remoto" },
      },
      en: {
        htmlLang: "en",
        meta: {
          title: "Why Orkesta? — n8n and Claude automation compared",
          desc: "Compare Orkesta with freelancers, generalist agencies and self-service platforms for n8n and AI agent automation projects.",
        },
        waDefault: "Hi, I want to know if Orkesta is the right choice for my business.",
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
          kicker: "Comparison · Why Orkesta?",
          h1: "n8n and AI automation: <em>why Orkesta?</em>",
          lead: "There are many ways to automate a business: self-service platforms, technical freelancers, generalist agencies. This page honestly explains what sets Orkesta apart — and when another option might serve you better.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Book a diagnostic",
        },
        differentiators: {
          kicker: "Four differentiators",
          title: "What sets us apart <em>from the alternatives</em>.",
          items: [
            { iconId: "i-flujo",   t: "Open-source stack, no lock-in",        d: "We build on n8n (open-source). The code and flows live in your infrastructure; you don't depend on Orkesta for them to keep running." },
            { iconId: "i-agente",  t: "Automation + AI in one team",           d: "n8n orchestrates the flows; Claude API adds reasoning. Most consultancies offer one or the other, not both integrated." },
            { iconId: "i-modelo",  t: "Process diagnosis first",               d: "Before writing code, we map what to automate and what delivers the most ROI. We don't sell implementations for the sake of it." },
            { iconId: "i-integra", t: "Ongoing support included",              d: "We deliver access, documentation and full handoff. The support plan covers monitoring, adjustments and new automations." },
          ],
        },
        compare: {
          kicker: "Comparison · 4 common options",
          title: "Choose the option that best <em>fits your business</em>.",
          desc: "There's no universal answer. Here's our honest take on each option — including when we're not the best choice.",
          headers: ["Aspect", "Orkesta", "Technical freelancer", "Generalist agency", "Self-service (Zapier/Make)"],
          rows: [
            { label: "Main stack",        values: ["n8n + Claude API (open-source)", "n8n / Make (varies)", "Any stack", "Zapier, Make, Airtable"] },
            { label: "Lock-in",           values: ["No lock-in — your code", "Depends on freelancer", "Depends on contracts", "Tied to the platform"] },
            { label: "AI agents",         values: ["Integrated when the process requires them", "Confirm experience and scope", "Confirm experience and scope", "Features vary by platform"] },
            { label: "Ongoing support",   values: ["Monthly plan included", "Variable, limited availability", "Formal SLA, higher cost", "Platform support"] },
            { label: "Close collaboration",   values: ["Yes — direct, clear work", "Variable", "More enterprise-oriented", "Yes, self-service"] },
            { label: "Initial diagnostic",values: ["Free, 30 min", "Paid or free consultation", "Long sales process", "Free trial"] },
          ],
        },
        when: {
          kicker: "Honesty first",
          title: "When should you <em>not</em> choose Orkesta?",
          desc: "We believe in clarity. There are cases where another option is better for you:",
          items: [
            { t: "If you want to run the tool yourself",        d: "Zapier or Make are good self-service options. You don't need a consultant if you have time to learn and the flows are simple." },
            { t: "If you have an internal technical team",       d: "If you already have engineers managing n8n, what you probably need is architecture review, not a managed service." },
            { t: "If the project is enterprise (50+ flows)",     d: "For large-scale implementations with teams of 100+, a larger agency with formal SLA may be more appropriate." },
            { t: "If the budget is very tight",                  d: "There are capable technical freelancers with lower rates. If we're not the right fit for your budget, we'll tell you." },
          ],
        },
        faqs: {
          kicker: "Frequently asked questions",
          title: "Common questions before <em>choosing a consultancy</em>.",
          items: [
            { q: "Why n8n and Claude together instead of just n8n?", a: "n8n orchestrates flows and connects systems; Claude adds reasoning. Steps that require decision-making, document interpretation or natural conversation need a language model. Together they cover both structured automation and steps that require AI." },
            { q: "What sets Orkesta apart from an n8n freelancer?", a: "A technical freelancer implements what you ask for. Orkesta starts with process diagnosis — what to automate first, which delivers the most ROI — and delivers with documentation, testing and ongoing support. We don't just build the flow; we ensure it works in production." },
            { q: "Can we work remotely?", a: "Yes. We collaborate remotely through WhatsApp, email and video calls, with clear follow-up at every stage." },
            { q: "What happens to my automation if I stop working with Orkesta?", a: "The code lives in your infrastructure (your n8n instance, your Claude API credentials). We deliver access, passwords and documentation. You don't depend on us for it to keep working." },
            { q: "How long does an implementation take?", a: "Timing is defined after the diagnostic, based on systems, exceptions and required controls. The proposal includes a concrete schedule before work begins." },
            { q: "Can you work with the software I already use?", a: "Yes. n8n connects with 400+ apps via native nodes and any system with a REST API or webhooks. If you already use HubSpot, Salesforce, Zoho, SAP, proprietary systems or internal APIs, we can integrate them." },
          ],
        },
        cta: {
          title: "Ready to compare <em>with your real case</em>?",
          desc: "30 minutes no commitment. We show you which automations have the most ROI for your business and which option best fits your situation — even if it's not us.",
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
          <span className="badge badge-green hero-kicker"><Ico id="i-modelo" w={13} h={13}/>{t.kicker}</span>
          <h1 dangerouslySetInnerHTML={{ __html: t.h1 }} />
          <p className="lead" dangerouslySetInnerHTML={{ __html: t.lead }} />
          <div className="ctas">
            <a href={waLink(null, lang)} target="_blank" className="btn btn-green"><Ico id="i-wa" w={20} h={20}/>{t.ctaWA}</a>
            <a href="/#contacto" className="btn btn-primary"><Ico id="i-cal" w={18} h={18}/>{t.ctaAgendar}</a>
          </div>
        </div>
      </section>
    );

    const Differentiators = ({ t }) => (
      <section id="differentiators" className="section">
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
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

    const CompareTable = ({ t }) => (
      <section id="compare" className="section" style={{background:"var(--paper-2)"}}>
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <div className="why-table-wrap">
            <table className="why-table">
              <thead>
                <tr>
                  {t.headers.map((h, i) => (
                    <th key={h} className={i === 1 ? 'col-highlight' : ''}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map(row => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    {row.values.map((v, i) => (
                      <td key={i} className={i === 0 ? 'col-highlight' : ''}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );

    const WhenNot = ({ t }) => (
      <section id="when-not" className="section">
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <div className="when-grid">
            {t.items.map(item => (
              <div key={item.t} className="when-card">
                <div className="when-card-title">{item.t}</div>
                <p className="when-card-desc">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    const FAQSection = ({ t }) => (
      <section id="faqs" className="section" style={{background:"var(--paper-2)"}}>
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
            </div>
          </div>
          <div className="faq-list">
            {t.items.map(item => (
              <div key={item.q} className="faq-item">
                <div className="faq-q">{item.q}</div>
                <p className="faq-a">{item.a}</p>
              </div>
            ))}
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
            <Differentiators t={t.differentiators} />
            <CompareTable t={t.compare} />
            <WhenNot t={t.when} />
            <FAQSection t={t.faqs} />
            <CtaFinal t={t.cta} lang={lang} />
          </main>
          <Footer t={t.footer} />
          <FloatingWA lang={lang} />
        </div>
      );
    };

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  
