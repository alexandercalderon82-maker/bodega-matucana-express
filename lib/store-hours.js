export const defaultHours = { openingTime:'07:00', closingTime:'22:00', openingDays:[0,1,2,3,4,5,6], storeMode:'auto' };
export function validateHours(value) {
  const result = { ...defaultHours };
  for (const field of ['openingTime','closingTime']) {
    const time = value[field] ?? defaultHours[field];
    if (typeof time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Escribe un horario válido.');
    result[field] = time;
  }
  if (result.openingTime === result.closingTime) throw Error('La apertura y el cierre deben tener horas distintas.');
  result.openingDays = value.openingDays ?? defaultHours.openingDays;
  if (!Array.isArray(result.openingDays) || result.openingDays.some(d=>!Number.isInteger(d)||d<0||d>6) || new Set(result.openingDays).size!==result.openingDays.length) throw Error('Selecciona días de atención válidos.');
  result.storeMode = value.storeMode ?? 'auto';
  if (!['auto','closed'].includes(result.storeMode)) throw Error('Estado de atención inválido.');
  return result;
}
const formatter = new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export function isStoreOpen(settings, timestamp) {
  if (settings.storeMode === 'closed') return false;
  const parts=Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(p=>[p.type,p.value]));
  const day=weekdays.indexOf(parts.weekday); const minute=Number(parts.hour)*60+Number(parts.minute);
  const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
  const start=minutes(settings.openingTime),end=minutes(settings.closingTime);
  if(start<end)return settings.openingDays.includes(day)&&minute>=start&&minute<end;
  return (settings.openingDays.includes(day)&&minute>=start)||(settings.openingDays.includes((day+6)%7)&&minute<end);
}
export function hoursLabel(settings) {
  const days=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  return `${settings.openingDays.length===7?'Todos los días':settings.openingDays.length?settings.openingDays.map(d=>days[d]).join(', '):'Sin días de atención'} · ${settings.openingTime}–${settings.closingTime} (hora de Perú)`;
}
