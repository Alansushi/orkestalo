import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

    const { useState } = React;

    const CONFIG = { marca: "Orkesta", whatsapp: "525549713262", email: "info@orkestalo.com" };

    const TRANSLATIONS = {
      es: {
        htmlLang: "es",
        meta: {
          title: "Automatización con IA para PyMEs en LATAM — Guía 2026 | Orkesta",
          desc: "Guía práctica de automatización con IA para PyMEs en México y LATAM. Cuándo usar n8n, cuándo agentes IA, cómo calcular el ROI y por dónde empezar.",
        },
        waDefault: "Hola, quiero automatizar procesos en mi empresa con n8n y/o IA.",
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
          kicker: "Guía · Automatización IA para PyMEs en LATAM · 2026",
          h1: 'Automatización con IA para PyMEs en LATAM: <em>guía práctica 2026</em>.',
          lead: 'Las PyMEs en México y América Latina tienen acceso hoy a herramientas de automatización e IA que antes eran territorio del enterprise. Esta guía explica qué automatizar, cuándo usar n8n vs agentes IA, cómo calcular el ROI y por dónde empezar.',
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        intro: {
          kicker: "Fundamentos",
          title: '¿Qué es automatización con IA y en qué <em>se diferencia del RPA</em>?',
          desc: "La automatización tradicional (RPA) sigue reglas fijas. La automatización con IA añade razonamiento: el sistema interpreta contexto, toma decisiones y maneja excepciones. En la práctica, n8n cubre los pasos estructurados y Claude API cubre los que requieren comprensión de lenguaje o documentos.",
          items: [
            { iconId: "i-flujo",   t: "Automatización estructurada (n8n)",      d: "Conectar apps, disparar flujos, mover datos, manejar retries. Pasos predecibles donde el 'qué hacer' es siempre el mismo." },
            { iconId: "i-agente",  t: "Automatización con IA (Claude API)",     d: "Interpretar documentos, mantener conversación con clientes, tomar decisiones con contexto. Pasos donde el resultado depende del contenido." },
            { iconId: "i-integra", t: "Orquestación combinada",                  d: "Para procesos end-to-end con pasos mixtos: n8n como orquestador de flujos y Claude para los pasos que requieren razonamiento." },
            { iconId: "i-modelo",  t: "Sin lock-in",                             d: "El stack Orkesta (n8n open-source + Claude API) vive en tu infraestructura. No dependes de plataformas cerradas con precios variables." },
          ],
        },
        decision: {
          kicker: "Tabla de decisión",
          title: '¿n8n, agentes IA, <em>o ambos</em>?',
          desc: "La respuesta depende del tipo de paso en tu proceso. Usa esta tabla para decidir.",
          headers: ["Situación", "Herramienta", "Ejemplo práctico"],
          rows: [
            { cols: ["Pasos predecibles, datos estructurados", "n8n solo", "Sincronizar formulario al CRM"] },
            { cols: ["Interpretar documentos o lenguaje natural", "Claude API", "Leer facturas y extraer datos al ERP"] },
            { cols: ["Conversación + acciones en sistemas", "Agente Claude con tool use", "Asistente de ventas en WhatsApp"] },
            { cols: ["Proceso end-to-end con pasos mixtos", "n8n + Claude integrados", "Recibir pedido → leer correo → validar → notificar"] },
          ],
        },
        roi: {
          kicker: "Cómo calcular el ROI",
          title: 'Estima el retorno <em>antes de invertir</em>.',
          desc: "Antes de comprometerte con cualquier automatización, calcula si el ahorro justifica la inversión. Fórmula básica:",
          formula: "ROI = (horas ahorradas/semana × costo por hora × 52) − costo total anual (implementación + soporte)",
          example: {
            label: "Ejemplo ilustrativo",
            lines: [
              "Proceso: 10 horas/semana a $150 MXN/hora",
              "Ahorro anual potencial: $78,000 MXN",
              "Implementación: $30,000 MXN · Soporte: $1,500/mes ($18,000/año)",
              "Costo total anual: $48,000 MXN",
              "Retorno neto año 1: $30,000 MXN · Payback: ~mes 8",
            ],
            note: "Los resultados reales varían según el proceso. El diagnóstico de Orkesta incluye una estimación antes de comprometerte.",
          },
        },
        patterns: {
          kicker: "5 patrones comunes",
          title: 'Los procesos que más automatizan <em>las PyMEs en LATAM</em>.',
          items: [
            { num: "01", t: "Procesamiento de facturas",         d: "Recibir comprobantes por correo, extraer datos con IA y cargarlos al ERP o hoja. Elimina horas de data entry y errores de captura." },
            { num: "02", t: "Alta de clientes y CRM",            d: "Nuevo formulario o pago → crea contacto en CRM, envía bienvenida, agenda onboarding. Sin intervención manual." },
            { num: "03", t: "Atención y leads por WhatsApp",     d: "Agente con Claude que responde dudas, califica interés y agenda llamadas — fuera de horario, sin costo adicional por ticket." },
            { num: "04", t: "Reportes recurrentes automáticos",  d: "Reportes de ventas, inventario u operaciones que se generan solos y se envían al equipo cada lunes a las 8am." },
            { num: "05", t: "Conciliación de pagos",             d: "Mercado Pago u otra pasarela notifica el cobro; el flujo registra el ingreso y marca el pedido como pagado automáticamente." },
          ],
        },
        signals: {
          kicker: "¿Por dónde empezar?",
          title: 'Señales de que un proceso <em>es buen candidato</em>.',
          desc: "No todos los procesos valen la pena automatizar. Estos son los indicadores más claros de alto ROI potencial:",
          items: [
            "Se repite más de 5 veces por semana.",
            "Involucra copiar datos de un sistema a otro manualmente.",
            "Genera errores humanos frecuentes (datos mal capturados, correos olvidados).",
            "Tarda más de 30 minutos aunque los pasos son siempre los mismos.",
            'Alguien en el equipo lo describe como "lo odio pero hay que hacerlo".',
          ],
        },
        cluster: {
          kicker: "Explora más",
          title: 'Soluciones Orkesta para <em>cada parte del proceso</em>.',
          links: [
            { label: "Automatización con n8n →",          href: "/automatizacion-n8n.html" },
            { label: "Agentes con Claude →",               href: "/agentes-ia-claude.html" },
            { label: "Orquestación de agentes →",          href: "/orquestacion-agentes.html" },
            { label: "Procesamiento de documentos →",      href: "/procesamiento-documentos-ia.html" },
          ],
        },
        faqs: {
          kicker: "Preguntas frecuentes",
          title: 'Dudas comunes sobre <em>automatización con IA en PyMEs</em>.',
          items: [
            { q: "¿Qué es la automatización con IA y en qué se diferencia del RPA tradicional?", a: "La automatización tradicional (RPA) sigue reglas fijas: si pasa A, haz B. La automatización con IA añade razonamiento: el sistema interpreta contexto, toma decisiones y maneja excepciones. n8n cubre la parte estructurada y Claude API cubre los pasos que requieren comprensión de lenguaje natural o documentos." },
            { q: "¿Cuándo conviene usar n8n y cuándo agentes IA?", a: "Usa n8n cuando los pasos son predecibles: mover datos entre sistemas, disparar notificaciones, sincronizar registros. Agrega agentes IA cuando necesitas interpretar documentos, mantener conversación con clientes o tomar decisiones basadas en contexto. Para la mayoría de las PyMEs, la solución óptima combina ambos: n8n como orquestador y Claude para los pasos que requieren razonamiento." },
            { q: "¿Cómo calculo el ROI de automatizar un proceso?", a: "Fórmula básica: (horas ahorradas por semana × costo por hora × 52 semanas) − costo de implementación y soporte anual. El diagnóstico gratuito de Orkesta incluye una estimación de ROI antes de que te comprometas con cualquier implementación." },
            { q: "¿Por dónde debería empezar a automatizar mi empresa?", a: "Empieza por el proceso más doloroso que también sea predecible. Señales de buen candidato: se repite más de 5 veces por semana, involucra copiar datos entre sistemas, genera errores frecuentes o tarda más de 30 minutos siempre en los mismos pasos. El diagnóstico gratuito de Orkesta (30 min) identifica los 2-3 procesos con mayor ROI potencial." },
            { q: "¿Las PyMEs en México y LATAM pueden costear automatización con IA?", a: "Sí. Las herramientas open-source como n8n eliminaron las barreras de licencia que existían con plataformas enterprise. El costo real es el de implementación y soporte — no el de licencias de software. Muchos proyectos de automatización para PyMEs tienen un payback de menos de 6 meses cuando se identifica el proceso correcto." },
            { q: "¿Qué procesos son los más comunes para automatizar en PyMEs de LATAM?", a: "Los cinco patrones más frecuentes son: (1) procesamiento de facturas y comprobantes entrantes, (2) alta de clientes y sincronización CRM, (3) atención y calificación de leads por WhatsApp, (4) reportes recurrentes de ventas y operaciones, (5) conciliación de pagos con Mercado Pago u otras pasarelas." },
          ],
        },
        cta: {
          title: '¿Listo para identificar el proceso <em>con más ROI en tu empresa</em>?',
          desc: "30 minutos sin compromiso. Mapeamos tus procesos, identificamos los 2-3 con mayor impacto y te decimos qué herramientas y cuánto tiempo tomaría implementarlos.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Agendar diagnóstico",
        },
        footer: { tagline: "Automatización e IA", country: "México" },
      },
      en: {
        htmlLang: "en",
        meta: {
          title: "AI Automation for SMBs in LATAM — 2026 Guide | Orkesta",
          desc: "Practical guide to AI automation for small and medium businesses in Mexico and LATAM. When to use n8n, when AI agents, how to calculate ROI and where to start.",
        },
        waDefault: "Hi, I want to automate processes in my business with n8n and/or AI.",
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
          kicker: "Guide · AI Automation for SMBs in LATAM · 2026",
          h1: "AI automation for SMBs in LATAM: <em>practical 2026 guide</em>.",
          lead: "SMBs in Mexico and Latin America now have access to automation and AI tools that used to be enterprise-only. This guide explains what to automate, when to use n8n vs AI agents, how to calculate ROI and where to start.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Book a diagnostic",
        },
        intro: {
          kicker: "Fundamentals",
          title: "What is AI automation and how does it <em>differ from RPA</em>?",
          desc: "Traditional RPA follows fixed rules. AI automation adds reasoning: the system interprets context, makes decisions and handles exceptions. n8n covers structured steps and Claude API covers those that require language or document understanding.",
          items: [
            { iconId: "i-flujo",   t: "Structured automation (n8n)",     d: "Connect apps, trigger flows, move data, handle retries. Predictable steps where the 'what to do' is always the same." },
            { iconId: "i-agente",  t: "AI automation (Claude API)",       d: "Interpret documents, maintain conversation with customers, make context-based decisions. Steps where the result depends on content." },
            { iconId: "i-integra", t: "Combined orchestration",           d: "For end-to-end processes with mixed steps: n8n as flow orchestrator and Claude for steps that require reasoning." },
            { iconId: "i-modelo",  t: "No lock-in",                       d: "The Orkesta stack (n8n open-source + Claude API) lives in your infrastructure. No dependency on closed platforms with variable pricing." },
          ],
        },
        decision: {
          kicker: "Decision table",
          title: "n8n, AI agents, <em>or both</em>?",
          desc: "The answer depends on the type of step in your process. Use this table to decide.",
          headers: ["Situation", "Tool", "Practical example"],
          rows: [
            { cols: ["Predictable steps, structured data", "n8n only", "Sync form data to CRM"] },
            { cols: ["Interpret documents or natural language", "Claude API", "Read invoices and load data to ERP"] },
            { cols: ["Conversation + actions in systems", "Claude agent with tool use", "WhatsApp sales assistant"] },
            { cols: ["End-to-end with mixed steps", "n8n + Claude integrated", "Receive order → read email → validate → notify"] },
          ],
        },
        roi: {
          kicker: "How to calculate ROI",
          title: "Estimate the return <em>before you invest</em>.",
          desc: "Before committing to any automation, calculate whether the savings justify the investment. Basic formula:",
          formula: "ROI = (hours saved/week × hourly cost × 52) − total annual cost (implementation + support)",
          example: {
            label: "Illustrative example",
            lines: [
              "Process: 10 hours/week at $8 USD/hour",
              "Potential annual savings: $4,160 USD",
              "Implementation: $1,500 USD · Support: $75/month ($900/year)",
              "Total annual cost: $2,400 USD",
              "Net return year 1: $1,760 USD · Payback: ~month 7",
            ],
            note: "Actual results vary by process. Orkesta's diagnostic includes a ROI estimate before you commit.",
          },
        },
        patterns: {
          kicker: "5 common patterns",
          title: "The processes SMBs in LATAM <em>automate most</em>.",
          items: [
            { num: "01", t: "Invoice processing",               d: "Receive receipts by email, extract data with AI and load them to ERP or spreadsheet. Eliminates hours of data entry and capture errors." },
            { num: "02", t: "Customer onboarding and CRM",      d: "New form or payment → creates contact in CRM, sends welcome email, schedules onboarding. No manual intervention." },
            { num: "03", t: "WhatsApp lead handling",           d: "Claude agent that answers questions, qualifies interest and schedules calls — after hours, at no additional cost per ticket." },
            { num: "04", t: "Automated recurring reports",      d: "Sales, inventory or operations reports generated automatically and sent to the team every Monday at 8am." },
            { num: "05", t: "Payment reconciliation",           d: "Payment gateway notifies each charge; the flow records the income and marks the order as paid automatically." },
          ],
        },
        signals: {
          kicker: "Where to start?",
          title: "Signs that a process <em>is a good automation candidate</em>.",
          desc: "Not every process is worth automating. These are the clearest signals of high ROI potential:",
          items: [
            "It repeats more than 5 times per week.",
            "It involves manually copying data from one system to another.",
            "It generates frequent human errors (wrong data, forgotten emails).",
            "It takes more than 30 minutes even though the steps are always the same.",
            '"Someone on the team describes it as "I hate it but we have to do it".',
          ],
        },
        cluster: {
          kicker: "Explore more",
          title: "Orkesta solutions for <em>each part of the process</em>.",
          links: [
            { label: "Automation with n8n →",          href: "/automatizacion-n8n.html" },
            { label: "Agents with Claude →",            href: "/agentes-ia-claude.html" },
            { label: "Agent orchestration →",           href: "/orquestacion-agentes.html" },
            { label: "Document processing →",           href: "/procesamiento-documentos-ia.html" },
          ],
        },
        faqs: {
          kicker: "Frequently asked questions",
          title: "Common questions about <em>AI automation for SMBs</em>.",
          items: [
            { q: "What is AI automation and how does it differ from traditional RPA?", a: "Traditional automation (RPA) follows fixed rules: if A happens, do B. AI automation adds a reasoning step: the system interprets context, makes decisions and handles exceptions. n8n covers the structured part and Claude API covers steps that require natural language or document understanding." },
            { q: "When should I use n8n and when AI agents?", a: "Use n8n when steps are predictable: moving data between systems, triggering notifications, syncing records. Add AI agents when you need to interpret documents, maintain conversation with customers or make context-based decisions. For most SMBs, the optimal solution combines both: n8n as orchestrator and Claude for steps that require reasoning." },
            { q: "How do I calculate the ROI of automating a process?", a: "Basic formula: (hours saved per week × hourly cost × 52 weeks) − annual implementation and support cost. Orkesta's free diagnostic includes an ROI estimate before you commit to any implementation." },
            { q: "Where should I start automating my business?", a: "Start with the most painful process that is also predictable. Signs of a good candidate: repeats more than 5 times per week, involves copying data between systems, generates frequent errors or takes more than 30 minutes with always the same steps. Orkesta's free diagnostic (30 min) identifies the 2-3 processes with the highest ROI potential." },
            { q: "Can SMBs in Mexico and LATAM afford AI automation?", a: "Yes. Open-source tools like n8n eliminated the licensing barriers that existed with enterprise platforms. The real cost is implementation and support — not software licenses. Many automation projects for SMBs have a payback of less than 6 months when the right process is identified." },
            { q: "What processes are most commonly automated in LATAM SMBs?", a: "The five most frequent patterns are: (1) processing incoming invoices and receipts, (2) customer onboarding and CRM sync, (3) WhatsApp lead handling and qualification, (4) recurring sales and operations reports, (5) payment reconciliation with local gateways." },
          ],
        },
        cta: {
          title: "Ready to identify the process with <em>the most ROI in your business</em>?",
          desc: "30 minutes no commitment. We map your processes, identify the 2-3 with the highest impact and tell you what tools and how long it would take to implement them.",
          ctaWA: "WhatsApp",
          ctaAgendar: "Book a diagnostic",
        },
        footer: { tagline: "Automation & AI", country: "Mexico" },
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

    const Intro = ({ t }) => (
      <section id="intro" className="section">
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

    const DecisionTable = ({ t }) => (
      <section id="decision" className="section" style={{background:"var(--paper-2)"}}>
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <div className="decision-table-wrap">
            <table className="decision-table">
              <thead>
                <tr>{t.headers.map(h => <th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {t.rows.map((row, i) => (
                  <tr key={i}>{row.cols.map((c, j) => <td key={j}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );

    const ROI = ({ t }) => (
      <section id="roi" className="section">
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <div className="roi-box">
            <div style={{marginBottom:"1rem", fontWeight:600}}>{t.formula}</div>
            <div style={{borderTop:"1px solid var(--ink-3)", paddingTop:"1rem", marginTop:"0.5rem"}}>
              <div style={{fontWeight:600, marginBottom:"0.5rem", color:"var(--ink-2)", fontSize:"0.75rem", textTransform:"uppercase", letterSpacing:"0.05em"}}>{t.example.label}</div>
              {t.example.lines.map(line => <div key={line}><strong>·</strong> {line}</div>)}
            </div>
            <p style={{marginTop:"1rem", fontSize:"0.8rem", color:"var(--ink-2)", fontFamily:"var(--sans)", marginBottom:0}}>{t.example.note}</p>
          </div>
        </div>
      </section>
    );

    const Patterns = ({ t }) => (
      <section id="patterns" className="section" style={{background:"var(--paper-2)"}}>
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
            </div>
          </div>
          <div className="patterns-grid">
            {t.items.map(item => (
              <div key={item.num} className="pattern-card">
                <div className="pattern-num">{item.num}</div>
                <div className="pattern-title">{item.t}</div>
                <p className="pattern-desc">{item.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );

    const Signals = ({ t }) => (
      <section id="signals" className="section">
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
              <p className="sec-desc">{t.desc}</p>
            </div>
          </div>
          <ul className="compare-list" style={{marginTop:"1.5rem", maxWidth:"640px"}}>
            {t.items.map(item => (
              <li key={item} className="compare-item">
                <svg className="compare-item-ico"><use href="/defs.svg#i-check"/></svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    );

    const Cluster = ({ t }) => (
      <section id="cluster" className="section" style={{background:"var(--paper-2)"}}>
        <div className="wrap">
          <div className="sec-hdr sec-hdr--solo">
            <div>
              <div className="sec-kicker">{t.kicker}</div>
              <h2 className="sec-title" dangerouslySetInnerHTML={{ __html: t.title }} />
            </div>
          </div>
          <div className="cluster-links">
            {t.links.map(link => (
              <a key={link.href} href={link.href} className="cluster-link">{link.label}</a>
            ))}
          </div>
        </div>
      </section>
    );

    const FAQSection = ({ t }) => (
      <section id="faqs" className="section">
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
      <section className="section" style={{background:"var(--paper-2)"}}>
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
            <Intro t={t.intro} />
            <DecisionTable t={t.decision} />
            <ROI t={t.roi} />
            <Patterns t={t.patterns} />
            <Signals t={t.signals} />
            <Cluster t={t.cluster} />
            <FAQSection t={t.faqs} />
            <CtaFinal t={t.cta} lang={lang} />
          </main>
          <Footer t={t.footer} />
          <FloatingWA lang={lang} />
        </div>
      );
    };

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);
  