const form = document.getElementById('survey-form');
const output = document.getElementById('survey-result');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const token = new URL(location.href).searchParams.get('token');
  const data = Object.fromEntries(new FormData(form));
  if (!token) { output.textContent = 'El enlace de encuesta es inválido.'; return; }
  const response = await fetch('/api/consultorio-misc?route=survey', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ token, rating:Number(data.rating), comment:data.comment || '' }) });
  output.textContent = response.ok ? 'Gracias por compartir tu opinión.' : 'No se pudo guardar la respuesta. Comprueba el enlace e inténtalo de nuevo.';
  if (response.ok) form.hidden = true;
});
