const providerNames = { google_ads:'Google Ads', meta_ads:'Meta Ads', search_console:'Google Search Console', pagespeed:'PageSpeed Insights', crux:'Chrome UX Report', uptime:'Disponibilidad' };
const metricNames = { clicks:'Clics', impressions:'Impresiones', cost:'Inversión', ctr:'CTR', position:'Posición', lcp:'LCP', inp:'INP', cls:'CLS' };
const sum = (rows, key) => rows.reduce((n, row) => n + Number(row[key] || 0), 0);

function grouped(rows, fields, totals) {
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify(fields.map(field => row[field]));
    const current = groups.get(key) || { ...row, ...Object.fromEntries(totals.map(field => [field, 0])) };
    for (const field of totals) current[field] += Number(row[field] || 0);
    groups.set(key, current);
  }
  return [...groups.values()];
}

export function measurementViewModel(dataset, siteId = '') {
  const site = dataset.sites.find(row => row.id === siteId);
  const scope = rows => (rows || []).filter(row => !siteId || row.site_id === siteId);
  const daily = scope(dataset.daily);
  const funnel = scope(dataset.funnel);
  const metrics = [
    ['Visitas', daily, 'visits', 'Sesiones registradas'],
    ['Intención de contacto', daily, 'contact_clicks', 'Clics en canales de contacto'],
    ['Formularios enviados', daily, 'form_submits', 'Envíos registrados'],
    ['Reservas verificadas', funnel, 'bookings', 'Solo agenda activa'],
    ['Pagos aprobados', funnel, 'approved_payments', 'Confirmados por Mercado Pago'],
    ['Citas confirmadas', funnel, 'confirmed_appointments', 'Confirmadas en Cal.com'],
  ].map(([label, rows, key, hint]) => ({ label, value: rows.length ? sum(rows, key) : 'Aún sin datos', hint }));
  return {
    site, metrics, updatedAt: dataset.updatedAt,
    funnel: grouped(funnel, ['site_id','source','medium','campaign'], ['visits','bookings','approved_payments','confirmed_appointments']),
    actions: grouped(scope(dataset.actions), ['site_id','path','name','label'], ['events']),
    pages: grouped(scope(dataset.pages), ['site_id','path'], ['page_views','visits']).sort((a,b) => b.page_views-a.page_views),
    transitions: grouped(scope(dataset.transitions), ['site_id','from_path','to_path'], ['transitions']).sort((a,b) => b.transitions-a.transitions),
    daily: [...daily].reverse(),
    sources: grouped(scope(dataset.sources), ['source','medium','campaign'], ['visits','contact_clicks']).sort((a,b) => b.visits-a.visits),
    external: scope(dataset.external).sort((a,b) => String(b.day).localeCompare(String(a.day))),
    connections: Object.keys(providerNames).map(provider => {
      const last = scope(dataset.connections).filter(row => row.provider === provider).sort((a,b) => String(b.last_synced_at).localeCompare(String(a.last_synced_at)))[0];
      return { provider: providerNames[provider], updated: last?.last_synced_at ? new Date(last.last_synced_at).toLocaleString('es-MX') : 'Sin sincronizar', status: last?.last_error || (!last ? 'Pendiente de conectar' : 'Correcta') };
    }),
  };
}

const tables = [
  ['pages','Páginas visitadas','Vistas y sesiones de visitantes que aceptaron la medición.',['Sitio','Página','Vistas','Sesiones'],'Aquí aparecerán las páginas visitadas con consentimiento.'],
  ['transitions','Entre páginas','Cambios de página agregados de visitantes que aceptaron la medición.',['Sitio','Origen','Destino','Transiciones'],'Aquí aparecerán las transiciones entre páginas.'],
  ['funnel','Embudo por campaña','Las reservas, pagos y citas proceden de verificaciones de los servidores del sitio.',['Sitio','Origen','Medio','Campaña','Visitas','Reservas','Pagos aprobados','Citas confirmadas'],'Aquí aparecerán las campañas de visitas con consentimiento.'],
  ['actions','Rutas y acciones','Secciones y accesos a agenda separados de los clics de contacto.',['Ruta','Acción','Sección','Eventos'],'Aquí aparecerán las rutas, secciones y accesos registrados.'],
  ['daily','Evolución diaria','Visitas e intención de contacto por día.',['Fecha','Visitas','Clics de contacto','Formularios enviados'],'Aquí aparecerán las visitas y acciones registradas por día.'],
  ['sources','De dónde llegan','Origen, medio y campaña registrados en el sitio.',['Origen','Medio','Campaña','Visitas','Intención de contacto'],'Aquí aparecerán los orígenes y campañas registrados.'],
  ['external','Métricas importadas','Resultados de plataformas externas, cuando están conectadas.',['Fecha','Proveedor','Campaña','Métrica','Valor'],'Aquí aparecerán las métricas de plataformas conectadas.'],
  ['connections','Estado de las fuentes externas','La ausencia de una conexión no se presenta como un resultado medido.',['Proveedor','Última actualización','Estado'],null],
];

function cell(row, value) { const td = document.createElement('td'); td.textContent = String(value ?? '—'); row.append(td); }
function el(tag, className, value) { const node = document.createElement(tag); if (className) node.className = className; if (value != null) node.textContent = value; return node; }

export function renderMeasurementView(container, dataset, { siteId = '', presenting = false } = {}) {
  const model = measurementViewModel(dataset, siteId);
  container.replaceChildren();
  const scope = el('section','mv-scope');
  scope.append(el('span','mv-kicker',presenting ? 'Presentación / Sitio seleccionado' : model.site ? 'Sitio seleccionado' : 'Vista general'));
  scope.append(el('h2','',model.site?.name || 'Todos los sitios'));
  scope.append(el('p','',model.site ? 'Resultados registrados durante los últimos 30 días.' : 'Selecciona un sitio para revisar sus resultados o presentarlo en una reunión.'));
  if (model.site && !model.site.active) scope.append(el('span','mv-badge','Medición inactiva'));
  container.append(scope);
  const summary = el('section','mv-grid');
  for (const metric of model.metrics) {
    const box = el('div','mv-metric');
    box.append(el('span','',metric.label), el('strong',metric.value === 'Aún sin datos' ? 'mv-empty-value' : '',metric.value), el('small','',metric.hint));
    summary.append(box);
  }
  container.append(summary);
  container.append(el('p','mv-updated',model.updatedAt ? `Actualizado: ${new Date(model.updatedAt).toLocaleString('es-MX')}` : 'Actualización no disponible'));
  container.append(el('p','mv-note','Cobertura limitada a visitantes que aceptaron analítica. Un clic de contacto no confirma una reserva ni un pago.'));
  if (dataset.navigationPending) container.append(el('p','mv-note','Los informes de navegación se activarán al terminar la actualización de datos.'));
  const values = {
    pages: row => [dataset.sites.find(site => site.id === row.site_id)?.name,row.path,row.page_views,row.visits],
    transitions: row => [dataset.sites.find(site => site.id === row.site_id)?.name,row.from_path,row.to_path,row.transitions],
    funnel: row => [dataset.sites.find(s => s.id === row.site_id)?.name,row.source,row.medium,row.campaign,row.visits,row.bookings,row.approved_payments,row.confirmed_appointments],
    actions: row => [row.path,row.name,row.label || '—',row.events],
    daily: row => [row.day,row.visits,row.contact_clicks,row.form_submits],
    sources: row => [row.source,row.medium,row.campaign,row.visits,row.contact_clicks],
    external: row => [row.day,providerNames[row.provider] || row.provider,row.campaign_ref,metricNames[row.metric] || row.metric,row.value],
    connections: row => [row.provider,row.updated,row.status],
  };
  for (const [key,title,description,heads,empty] of tables) {
    const card = el('section','mv-card'); card.append(el('h2','',title),el('p','',description));
    const rows = model[key];
    if (!rows.length && empty) card.append(el('div','mv-empty',`Aún sin datos · ${empty}`));
    else {
      const scroll = el('div','mv-scroll'), table = el('table'), thead = el('thead'), header = el('tr');
      for (const head of heads) header.append(el('th','',head));
      thead.append(header); const body = el('tbody');
      for (const row of rows) { const tr = el('tr'); for (const value of values[key](row)) cell(tr,value); body.append(tr); }
      table.append(thead,body); scroll.append(table); card.append(scroll);
    }
    container.append(card);
  }
  return model;
}
