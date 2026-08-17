import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

    const { useState } = React;

    const CONFIG = {
      marca: "Orkesta",
      whatsapp: "525549713262",
      email: "info@orkestalo.com",
    };

    const TRANSLATIONS = {
      es: {
        htmlLang: "es",
        meta: {
          title: "Preguntas frecuentes — Orkesta | Automatización e IA",
          desc: "Preguntas frecuentes: precios, tiempos, tecnologías (n8n, Claude, Mercado Pago), soporte continuo, seguridad, propiedad del código y facturación.",
        },
        waDefault: "Hola, tengo una pregunta sobre automatización.",
        nav: {
          links: [
            ["Soluciones", "/#soluciones"],
            ["Servicios",  "/#servicios"],
            ["Proceso",    "/#proceso"],
            ["Precios",    "/#precios"],
            ["Casos",      "/casos-de-uso.html"],
            ["Contacto",   "/#contacto"],
          ],
          cta: "Agenda una charla",
          menuLabel: "Menú",
        },
        hero: {
          kicker: "Preguntas frecuentes",
          h1: 'Todo lo que necesitas <em>saber</em> antes de empezar.',
          lead: "Precios, tiempos, stack, soporte, seguridad, propiedad del código, facturación. Si tu duda no está aquí, escríbenos por WhatsApp — respondemos rápido.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        faqs: {
          kicker: "14 preguntas · Agrupadas por tema",
          title: 'Lo que <em>quieren saber</em> primero.',
          desc: "Si necesitas más detalle o tienes una pregunta que no está aquí, escríbenos por WhatsApp.",
          grupos: [
            {
              titulo: "Trabajo y proyecto",
              items: [
                { q: "¿Cuánto cuesta una automatización con Orkesta?", a: "Cada propuesta es a la medida según el alcance. Empezamos con un diagnóstico inicial sin costo (30 minutos) donde detectamos las oportunidades de mayor impacto y entregamos una propuesta concreta con tiempos y entregables." },
                { q: "¿Cuánto tarda un proyecto típico?", a: "El tiempo se define después del diagnóstico, según sistemas, excepciones y controles requeridos. La propuesta incluye un calendario concreto antes de iniciar." },
                { q: "¿Cómo facturan?", a: "Emitimos facturas en MXN con CFDI 4.0 cuando el proyecto requiere facturación local." },
              ],
            },
            {
              titulo: "Stack y soporte",
              items: [
                { q: "¿Qué tecnologías usan?", a: "n8n para orquestación de flujos, Claude API para agentes e IA aplicada, Mercado Pago para cobros, y APIs/webhooks para integrar cualquier sistema con HTTP. Trabajamos sobre tu stack existente — no te obligamos a cambiar herramientas." },
                { q: "¿Necesito tener n8n o lo proveen ustedes?", a: "Las dos opciones. Si ya tienes n8n self-hosted o cloud, construimos sobre tu instancia. Si no, te ayudamos a decidir entre n8n cloud (más simple) o self-hosted (más control) y lo dejamos configurado a tu nombre antes de implementar." },
                { q: "¿Pueden trabajar con mi stack actual o tenemos que migrar?", a: "Trabajamos sobre tu stack existente — no te forzamos a migrar. Nos conectamos con tu CRM, ERP, hojas de cálculo, correo y cualquier sistema con API o webhook. Si aparece una incompatibilidad real, la detectamos en el diagnóstico inicial y te proponemos la ruta más simple." },
                { q: "¿Dan soporte después de implementar?", a: "Sí. Ofrecemos un plan de soporte continuo mensual a medida que incluye monitoreo, mantenimiento, ajustes y nuevas automatizaciones. También dejamos documentación completa para que tu equipo pueda operar sin depender de nosotros." },
              ],
            },
            {
              titulo: "Logística y equipo",
              items: [
                { q: "¿Cómo colaboran de forma remota?", a: "Trabajamos de forma remota por WhatsApp, correo y videollamada, con acuerdos claros de horarios y seguimiento." },
                { q: "¿Trabajan con empresas que no son técnicas?", a: "Sí, es nuestro caso típico. Trabajamos con empresas y equipos sin desarrollo interno. Hablamos de procesos y resultados, sin jerga técnica." },
                { q: "¿Puedo empezar con un solo proceso?",      a: "Sí, de hecho lo recomendamos. La mayoría de nuestros clientes empieza con la automatización que más les duele — puede ser facturación, seguimiento de clientes o reportes manuales. Una vez que ven el ROI, escalan. No hay mínimo de proyecto." },
                { q: "¿Sirve si mi equipo no es técnico?",        a: "Sí. Nosotros implementamos, documentamos y hacemos handoff completo. Tu equipo no necesita saber programar para operar lo que construimos — dejamos guías paso a paso y soporte para las primeras semanas." },
              ],
            },
            {
              titulo: "Datos, propiedad y legal",
              items: [
                { q: "¿Cómo manejan la seguridad de los datos?", a: "Las credenciales viven en tu propia instancia de n8n o en gestores de secretos (1Password, Vault, AWS Secrets Manager). Nunca almacenamos llaves en código. Para Claude y otros LLMs configuramos zero data retention donde el proveedor lo permite." },
                { q: "¿Firman NDA?", a: "Sí, sin problema. Firmamos NDA mutuo antes del diagnóstico inicial si hay información sensible en juego. Tenemos un template estándar que podemos compartir o trabajamos sobre el tuyo." },
                { q: "¿De quién es el código y los flujos al final del proyecto?", a: "Tuyo. Todo lo que construimos vive en tu infraestructura (tu n8n, tu cuenta de Claude, tu Mercado Pago). Te entregamos accesos completos, código, documentación y handoff sin lock-in." },
              ],
            },
          ],
        },
        cta: {
          title: '¿Tu pregunta no está <em>en la lista</em>?',
          desc: "Escríbenos por WhatsApp o agenda la llamada de 30 minutos. Te respondemos rápido y sin pitch.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        footer: { tagline: "Automatización e IA", country: "Trabajo remoto" },
      },
      en: {
        htmlLang: "en",
        meta: {
          title: "FAQ — Orkesta | Automation & AI",
          desc: "Frequently asked questions: pricing, timelines, tech stack (n8n, Claude, Mercado Pago), ongoing support, security, code ownership and billing.",
        },
        waDefault: "Hi, I have a question about automation.",
        nav: {
          links: [
            ["Solutions", "/#soluciones"],
            ["Services",  "/#servicios"],
            ["Process",   "/#proceso"],
            ["Pricing",   "/#precios"],
            ["Cases",     "/casos-de-uso.html"],
            ["Contact",   "/#contacto"],
          ],
          cta: "Schedule a call",
          menuLabel: "Menu",
        },
        hero: {
          kicker: "Frequently asked questions",
          h1: "Everything you <em>need to know</em> before starting.",
          lead: "Pricing, timelines, stack, support, security, code ownership, billing. If your question isn't here, write to us on WhatsApp — we respond fast.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Book a diagnostic",
        },
        faqs: {
          kicker: "14 questions · Grouped by topic",
          title: "What they <em>want to know</em> first.",
          desc: "If you need more detail on any, or have a question that isn't here, write to us on WhatsApp.",
          grupos: [
            {
              titulo: "Work & project",
              items: [
                { q: "How much does an automation cost?", a: "Each proposal is tailored to scope. We start with a free 30-minute diagnostic where we detect the highest-impact opportunities and deliver a concrete proposal with timing and deliverables." },
                { q: "How long does a typical project take?", a: "Timing is defined after the diagnostic, based on systems, exceptions and required controls. The proposal includes a concrete schedule before work begins." },
                { q: "How do you bill?", a: "We issue invoices in MXN with CFDI 4.0 when a project requires local invoicing." },
              ],
            },
            {
              titulo: "Stack & support",
              items: [
                { q: "What technologies do you use?", a: "n8n for workflow orchestration, Claude API for agents and applied AI, Mercado Pago for payments, and APIs/webhooks to integrate any HTTP system. We work on your existing stack — we don't force tool changes." },
                { q: "Do I need to have n8n or do you provide it?", a: "Both options. If you already have n8n self-hosted or cloud, we build on your instance. If not, we help you decide between n8n cloud (simpler) or self-hosted (more control) and set it up under your name before implementing." },
                { q: "Can you work with my current stack or do we have to migrate?", a: "We work on what you already have." },
                { q: "Do you provide support after implementation?", a: "Yes. We offer a custom monthly ongoing-support plan that includes monitoring, maintenance, adjustments and new automations. We also leave full documentation so your team can operate without depending on us." },
              ],
            },
            {
              titulo: "Logistics & team",
              items: [
                { q: "How do you collaborate remotely?", a: "We work remotely through WhatsApp, email and video calls, with clear agreements on schedules and follow-up." },
                { q: "Do you work with non-technical companies?", a: "Yes, it's our typical case. We work with businesses and teams without in-house developers. We talk about processes and results, without technical jargon." },
                { q: "Can I start with just one process?",        a: "Yes, in fact we recommend it. Most of our clients start with the automation that hurts them most — billing, customer follow-up or manual reports. Once they see the ROI, they scale. There's no project minimum." },
                { q: "Does it work if my team isn't technical?",  a: "Yes. We implement, document and do full handoff. Your team doesn't need to know how to code to operate what we build — we leave step-by-step guides and support for the first few weeks." },
              ],
            },
            {
              titulo: "Data, ownership & legal",
              items: [
                { q: "How do you handle data security?", a: "Credentials live in your own n8n instance or in secret managers (1Password, Vault, AWS Secrets Manager). We never store keys in code. For Claude and other LLMs we configure zero data retention where the provider allows it." },
                { q: "Do you sign NDAs?", a: "Yes, no problem. We sign a mutual NDA before the initial diagnostic if sensitive information is involved. We have a standard template we can share or we work on yours." },
                { q: "Who owns the code and workflows at the end of the project?", a: "You do. Everything we build lives in your infrastructure (your n8n, your Claude account, your Mercado Pago). We hand over full access, code, documentation and handoff with no lock-in." },
              ],
            },
          ],
        },
        cta: {
          title: "Is your question not <em>on the list</em>?",
          desc: "Write to us on WhatsApp or book the 30-minute call. We respond fast and without pitch.",
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

    /* ----------------------- NAV ----------------------- */
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
              {t.links.map(([label, href]) => (
                <a key={href} href={href} className="nav-link">{label}</a>
              ))}
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
              {t.links.map(([label, href]) => (
                <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>
              ))}
            </div>
          )}
        </header>
      );
    };

    /* ----------------------- HERO ----------------------- */
    const PageHero = ({ t, lang }) => (
      <section id="top" className="page-hero">
        <div className="wrap">
          <span className="badge badge-green hero-kicker"><Ico id="i-check" w={13} h={13}/>{t.kicker}</span>
          <h1 dangerouslySetInnerHTML={{ __html: t.h1 }} />
          <p className="lead">{t.lead}</p>
          <div className="ctas">
            <a href={waLink(null, lang)} target="_blank" className="btn btn-green"><Ico id="i-wa" w={20} h={20}/>{t.ctaWA}</a>
            <a href="/#contacto" className="btn btn-primary"><Ico id="i-cal" w={18} h={18}/>{t.ctaAgendar}</a>
          </div>
        </div>
      </section>
    );

    /* ----------------------- FAQS ----------------------- */
    const FaqGroup = ({ titulo, items }) => (
      <div style={{marginBottom: "48px"}}>
        <h3 style={{
          fontFamily: "var(--mono)",
          fontSize: "13px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--green)",
          marginBottom: "16px",
        }}>{titulo}</h3>
        <div className="faq-list">
          {items.map(item => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <div className="faq-body">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    );

    const FAQs = ({ t }) => (
      <section id="faqs" className="section">
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          {t.grupos.map(g => <FaqGroup key={g.titulo} {...g}/>)}
        </div>
      </section>
    );

    /* ----------------------- CTA FINAL ----------------------- */
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

    /* ----------------------- FOOTER ----------------------- */
    const Footer = ({ t }) => (
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} {CONFIG.marca} · {t.tagline} · {t.country} · <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a></span>
        <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a>
      </footer>
    );

    /* ----------------------- Floating WhatsApp ----------------------- */
    const FloatingWA = ({ lang }) => (
      <a href={waLink(null, lang)} target="_blank" aria-label="WhatsApp" className="floating-wa">
        <Ico id="i-wa" w={22} h={22}/>
        <span className="floating-wa-text">WhatsApp</span>
      </a>
    );

    /* ----------------------- APP ----------------------- */
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
            <FAQs t={t.faqs} />
            <CtaFinal t={t.cta} lang={lang} />
          </main>
          <Footer t={t.footer} />
          <FloatingWA lang={lang} />
        </div>
      );
    };

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  
