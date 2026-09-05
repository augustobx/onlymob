'use client';

import { useState, useTransition } from 'react';
import { createApiCredentialAction, createWebhookAction, revokeApiCredentialAction, testWebhookAction, toggleWebhookAction } from '@/actions/integrations';

type Data = any;

export function IntegrationsClient({ data }: { data: Data }) {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');

  function createKey(formData: FormData) {
    setMessage(''); setToken('');
    const scopes = data.scopes.filter((scope: string) => formData.get(scope) === 'on');
    startTransition(async () => {
      try { const result = await createApiCredentialAction({ name: String(formData.get('name') || ''), scopes }); setToken(result.token); setMessage('Clave creada. Copiala ahora: no se vuelve a mostrar.'); }
      catch (e:any) { setMessage(e?.message || 'No se pudo crear la clave.'); }
    });
  }

  function createWebhook(formData: FormData) {
    const events = data.events.filter((event: string) => formData.get(event) === 'on');
    startTransition(async () => {
      try { await createWebhookAction({ name: String(formData.get('name') || ''), url: String(formData.get('url') || ''), events }); location.reload(); }
      catch (e:any) { setMessage(e?.message || 'No se pudo crear el webhook.'); }
    });
  }

  return <div className="space-y-8">
    {message && <div className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 text-sm text-indigo-900">{message}{token && <code className="block mt-2 p-2 bg-white border rounded break-all select-all">{token}</code>}</div>}

    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Nueva credencial API</h2>
        <form action={createKey} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Nombre<input name="name" required className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Web pública / Integrador" /></label>
          <fieldset><legend className="text-xs font-semibold text-slate-600 mb-2">Scopes</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{data.scopes.map((scope:string) => <label key={scope} className="text-xs flex gap-2 items-center"><input type="checkbox" name={scope}/>{scope}</label>)}</div></fieldset>
          <button disabled={isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Crear clave</button>
        </form>
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="font-bold text-slate-900">Nuevo webhook</h2>
        <form action={createWebhook} className="space-y-3">
          <label className="block text-xs font-semibold text-slate-600">Nombre<input name="name" required className="mt-1 w-full border rounded-lg px-3 py-2" /></label>
          <label className="block text-xs font-semibold text-slate-600">URL HTTPS<input name="url" type="url" required className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="https://cliente.com/webhooks/onlymob" /></label>
          <fieldset><legend className="text-xs font-semibold text-slate-600 mb-2">Eventos</legend><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{data.events.map((event:string) => <label key={event} className="text-xs flex gap-2 items-center"><input type="checkbox" name={event}/>{event}</label>)}</div></fieldset>
          <button disabled={isPending} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold">Crear webhook</button>
        </form>
      </div>
    </section>

    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden"><h2 className="p-4 font-bold text-slate-900 border-b">Credenciales</h2><div className="divide-y">{data.credentials.length ? data.credentials.map((x:any) => <div key={x.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><b className="text-sm">{x.name}</b><p className="text-xs text-slate-500 font-mono">{x.tokenPrefix}… · {x.scopes.join(', ')}</p></div><button disabled={!x.isActive || isPending} onClick={() => startTransition(async()=>{await revokeApiCredentialAction(x.id); location.reload();})} className="text-xs font-bold text-rose-600 disabled:text-slate-300">{x.isActive?'Revocar':'Revocada'}</button></div>) : <p className="p-6 text-sm text-slate-400">Sin credenciales.</p>}</div></section>

    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="p-4 border-b flex justify-between items-center"><h2 className="font-bold text-slate-900">Webhooks</h2><button onClick={() => startTransition(async()=>{const r=await testWebhookAction(); setMessage(`Test: ${r.delivered}/${r.attempted} entregados`);})} className="text-xs font-bold text-indigo-600">Enviar test</button></div><div className="divide-y">{data.endpoints.length ? data.endpoints.map((x:any) => <div key={x.id} className="p-4 flex flex-col sm:flex-row justify-between gap-3"><div><b className="text-sm">{x.name}</b><p className="text-xs text-slate-500 break-all">{x.url}</p><p className="text-[11px] text-slate-400">{x.events.join(', ')}</p></div><button onClick={() => startTransition(async()=>{await toggleWebhookAction(x.id,!x.isActive); location.reload();})} className="text-xs font-bold text-indigo-600">{x.isActive?'Pausar':'Activar'}</button></div>) : <p className="p-6 text-sm text-slate-400">Sin webhooks.</p>}</div></section>

    <section className="bg-slate-900 text-slate-200 rounded-xl p-5 space-y-2"><h2 className="font-bold text-white">API v1</h2><p className="text-xs">Bearer token en <code>Authorization</code>. Endpoints disponibles:</p><code className="block text-xs whitespace-pre-wrap text-emerald-300">GET /api/v1/properties{`\n`}GET /api/v1/leads{`\n`}POST /api/v1/leads{`\n`}GET /api/v1/export/properties{`\n`}POST /api/v1/import/leads</code></section>
  </div>;
}
