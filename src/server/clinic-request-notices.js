import { db, sendNotice, validEmail } from './commerce.js';

const q=encodeURIComponent;
export async function deliverRequestNotice(clinic,request,history) {
  const now=new Date().toISOString();
  let claim=await db('clinic_request_history',{method:'PATCH',query:`?id=eq.${q(history.id)}&clinic_id=eq.${q(request.clinic_id)}&notification_status=in.(queued,failed)`,body:{notification_status:'sending',notification_claimed_at:now}});
  if(!claim.length) claim=await db('clinic_request_history',{method:'PATCH',query:`?id=eq.${q(history.id)}&clinic_id=eq.${q(request.clinic_id)}&notification_status=eq.sending&notification_claimed_at=lt.${q(new Date(Date.now()-10*60_000).toISOString())}`,body:{notification_claimed_at:now}});
  if(!claim.length) return false;
  try {
    if(history.status==='recibida') {
      await sendNotice({subject:`Nueva solicitud de ${clinic.name}`,text:`${request.title}\n${request.description}\nConsultorio: ${clinic.name}`,key:`clinic-request-${history.id}`});
    } else {
      if(!process.env.RESEND_API_KEY||!validEmail(request.requester_email)) throw new Error('Aviso no configurado');
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`clinic-request-${history.id}`},body:JSON.stringify({from:process.env.ORKESTA_EMAIL_FROM||'Orkéstalo <avisos@orkestalo.com>',to:[request.requester_email],subject:'Tu solicitud cambió de estado',text:`Tu solicitud «${request.title}» ahora está ${history.status}. Entra al panel para revisar el historial.`}),signal:AbortSignal.timeout(8000)});
      if(!response.ok) throw new Error(`Correo ${response.status}`);
    }
    await db('clinic_request_history',{method:'PATCH',query:`?id=eq.${q(history.id)}&clinic_id=eq.${q(request.clinic_id)}`,body:{notification_status:'sent',notification_sent_at:new Date().toISOString()}});
    return true;
  } catch(error) {
    console.error('Aviso de solicitud',error);
    await db('clinic_request_history',{method:'PATCH',query:`?id=eq.${q(history.id)}&clinic_id=eq.${q(request.clinic_id)}`,body:{notification_status:'failed'}});
    return false;
  }
}
