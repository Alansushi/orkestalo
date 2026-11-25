const setupTab = {
  identity: 'datos', calendar: 'agenda', content: 'datos',
  welcome: 'mensajes', followup: 'mensajes', invite: 'mensajes',
  survey: 'mensajes', privacy: 'mensajes', activate: 'mensajes',
};

export const tabForStep = id => setupTab[id] || 'inicio';

export function initialTab(steps = []) {
  return tabForStep(steps.find(step => !step.done)?.id);
}

export function progressByTab(steps = []) {
  const result = Object.fromEntries(['datos','agenda','mensajes','operacion'].map(name => [name,{ done:0,total:0 }]));
  for (const step of steps) {
    const tab = tabForStep(step.id);
    if (tab === 'inicio') continue;
    result[tab].total++;
    if (step.done) result[tab].done++;
  }
  return result;
}
