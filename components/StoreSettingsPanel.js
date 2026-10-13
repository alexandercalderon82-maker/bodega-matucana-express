'use client';
import { useState } from 'react';
import { useStoreSettings, saveStoreSettings } from '@/lib/store-settings';

export default function StoreSettingsPanel() {
  const { settings, error, available } = useStoreSettings();
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saveError, setSaveError] = useState('');
  const value = draft || settings;
  function update(field, next) { setDraft({ ...value, [field]: next }); setMessage(''); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setSaveError('');
    try { await saveStoreSettings(value); setDraft(null); setMessage('Condiciones de entrega y pagos guardadas.'); }
    catch (e) { setSaveError(e.message); } finally { setBusy(false); }
  }
  return <details className="store-settings-panel"><summary>Condiciones de entrega y métodos de pago</summary><p className="muted">Estos datos se muestran al cliente antes de enviar su pedido.</p>{error && <p role="alert" className="error">{error}</p>}<form onSubmit={save}>
    <div className="editor-grid"><label className="field">Delivery alrededores (S/)<input type="number" min="0" max="100000" step="0.01" required value={value.deliveryFee} onChange={e => update('deliveryFee', e.target.value)}/></label><label className="field">Horario de delivery<input required maxLength={500} value={value.deliveryHours} onChange={e => update('deliveryHours', e.target.value)}/></label></div>
    <label className="field">Delivery Matucana centro (S/)<input type="number" min="0" max="100000" step="0.01" required value={value.centerDeliveryFee} onChange={e => update('centerDeliveryFee', e.target.value)}/></label>
    <label className="field">Zonas de entrega<textarea aria-label="Zonas de entrega" required maxLength={500} value={value.deliveryZones} onChange={e => update('deliveryZones', e.target.value)}/></label>
    <label className="field">Tiempo estimado<textarea aria-label="Tiempo estimado" required maxLength={500} value={value.deliveryTime} onChange={e => update('deliveryTime', e.target.value)}/></label>
    <fieldset><legend>Horario de atención (hora de Perú)</legend><div className="editor-grid"><label className="field">Hora de apertura<input type="time" required value={value.openingTime} onChange={e => update('openingTime',e.target.value)}/></label><label className="field">Hora de cierre<input type="time" required value={value.closingTime} onChange={e => update('closingTime',e.target.value)}/></label></div><div className="opening-days">{['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'].map((day,index) => <label className="checkbox-field" key={day}><input type="checkbox" checked={value.openingDays.includes(index)} onChange={e => update('openingDays', e.target.checked ? [...value.openingDays,index].sort((a,b)=>a-b) : value.openingDays.filter(d=>d!==index))}/>{day}</label>)}</div><label className="checkbox-field"><input type="checkbox" checked={value.storeMode==='closed'} onChange={e => update('storeMode', e.target.checked ? 'closed' : 'auto')}/> Pausar atención temporalmente</label><p className="muted">Fuera de horario o durante una pausa, el cliente podrá preparar y enviar su pedido; verá que debe esperar confirmación. Un cierre anterior a la apertura indica atención hasta el día siguiente.</p></fieldset>
    <fieldset><legend>Métodos de pago aceptados</legend>{['Yape', 'Plin', 'Efectivo'].map(method => <label className="checkbox-field" key={method}><input type="checkbox" checked={value.paymentMethods.includes(method)} onChange={e => update('paymentMethods', e.target.checked ? [...value.paymentMethods, method] : value.paymentMethods.filter(m => m !== method))}/>{method}</label>)}</fieldset>
    <label className="field">Instrucciones de pago<textarea aria-label="Instrucciones de pago" required maxLength={500} value={value.paymentInstructions} onChange={e => update('paymentInstructions', e.target.value)}/></label>
    {saveError && <p className="error" role="alert">{saveError}</p>}{message && <p className="status" role="status">{message}</p>}<button className="primary" type="submit" disabled={busy || !available}>{busy ? 'Guardando…' : 'Guardar condiciones'}</button>
  </form></details>;
}
