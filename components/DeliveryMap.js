'use client';

import {useEffect,useRef,useState} from 'react';
import {MATUCANA_CENTER,validLocation,locationLink} from '@/lib/delivery-location';
import Icon from './Icons';
import {isPortablePreview} from '@/lib/supabase';

export default function DeliveryMap({value,onChange}) {
  const preview=isPortablePreview();
  const container=useRef(null);const map=useRef(null);const marker=useRef(null);const leaflet=useRef(null);
  const changed=useRef(onChange);const initial=useRef(value);const alive=useRef(true);
  const [ready,setReady]=useState(false);const [mapError,setMapError]=useState('');const [locationError,setLocationError]=useState('');const [locating,setLocating]=useState(false);
  useEffect(()=>{changed.current=onChange;},[onChange]);
  useEffect(()=>{
    if(preview)return;
    let mounted=true;alive.current=true;
    let resize;
    import('leaflet').then(module=>{
      if(!mounted||!container.current)return;
      const L=module.default||module;leaflet.current=L;
      const instance=L.map(container.current,{scrollWheelZoom:false,minZoom:3,maxZoom:19}).setView(MATUCANA_CENTER,15);map.current=instance;
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'}).on('tileerror',()=>{if(mounted)setMapError('No se pudo cargar una parte del mapa. Puedes indicar tu dirección escrita y continuar.');}).on('tileload',()=>{if(mounted)setMapError('');}).addTo(instance);
      instance.on('click',event=>changed.current({lat:event.latlng.lat,lng:event.latlng.lng}));
      if(validLocation(initial.current))place(initial.current,false);
      resize=new ResizeObserver(()=>instance.invalidateSize());resize.observe(container.current);
      setReady(true);
    }).catch(()=>{if(mounted)setMapError('No se pudo abrir el mapa. Escribe tu dirección y referencia para continuar.');});
    return()=>{mounted=false;alive.current=false;resize?.disconnect();map.current?.remove();map.current=null;marker.current=null;};
  },[preview]);
  function place(point,center){
    const L=leaflet.current;const instance=map.current;if(!L||!instance||!validLocation(point))return;
    if(!marker.current){
      const pin=L.divIcon({className:'delivery-pin',html:'<span class="delivery-pin-shape"><span></span></span>',iconSize:[30,40],iconAnchor:[15,38]});
      marker.current=L.marker([point.lat,point.lng],{icon:pin,draggable:true,title:'Arrastra el marcador al punto de entrega',alt:'Punto de entrega seleccionado',autoPan:true}).addTo(instance);
      marker.current.on('dragend',()=>{const position=marker.current.getLatLng();changed.current({lat:position.lat,lng:position.lng});});
    }else marker.current.setLatLng([point.lat,point.lng]);
    if(center)instance.setView([point.lat,point.lng],Math.max(instance.getZoom(),17));
  }
  useEffect(()=>{if(validLocation(value))place(value,false);else if(marker.current){marker.current.remove();marker.current=null;}},[value]);
  function locate(){
    if(!navigator.geolocation){setLocationError('Este navegador no permite obtener la ubicación. Marca el punto manualmente.');return;}
    setLocating(true);setLocationError('');
    navigator.geolocation.getCurrentPosition(position=>{
      if(!alive.current)return;
      const point={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy};
      if(!validLocation(point)){setLocationError('No se pudo obtener un punto válido. Marca la dirección manualmente.');setLocating(false);return;}
      changed.current(point);place(point,true);setLocating(false);
    },error=>{if(!alive.current)return;setLocating(false);setLocationError(error.code===1?'No diste permiso de ubicación. Puedes tocar el mapa para marcar tu dirección.':error.code===3?'La ubicación tardó demasiado. Intenta otra vez o marca el punto en el mapa.':'No se pudo obtener tu ubicación. Puedes marcarla manualmente.');},{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  if(preview)return <section className="delivery-map-section"><div className="map-heading"><strong>Mapa de Matucana</strong><span>Opcional</span></div><p>El mapa interactivo está disponible en la web publicada. Esta demostración descargable permite continuar con la dirección escrita.</p><a className="text-button" href="https://bodega-matucana-express-hx8c.vercel.app/" target="_blank" rel="noopener noreferrer">Abrir la tienda con el mapa <Icon name="arrow" size={14}/></a></section>;
  return <section className="delivery-map-section" aria-labelledby="delivery-map-title"><div className="map-heading"><strong id="delivery-map-title">Punto de entrega en el mapa</strong><span>Opcional</span></div><p>Toca el punto exacto o arrastra el marcador hasta la entrada de tu casa.</p><div className="map-actions"><button type="button" className="outline-button" disabled={!ready||locating} onClick={locate}><Icon name="pin" size={15}/>{locating?'Buscando ubicación…':'Usar mi ubicación'}</button><button type="button" className="text-button" disabled={!ready} onClick={()=>map.current?.setView(MATUCANA_CENTER,15)}>Ver Matucana</button></div><div className="delivery-map" ref={container} aria-label="Mapa para marcar la ubicación de entrega" tabIndex={0}/>{!ready&&!mapError&&<p role="status" className="map-feedback">Cargando mapa…</p>}<div className="map-actions map-actions-secondary"><button type="button" className="text-button" disabled={!ready} onClick={()=>{const point=map.current.getCenter();onChange({lat:point.lat,lng:point.lng});}}>Marcar centro del mapa</button>{validLocation(value)&&<button type="button" className="text-button" onClick={()=>{onChange(null);setLocationError('');}}>Quitar punto</button>}</div>{mapError&&<p className="map-feedback" role="status">{mapError}</p>}{locationError&&<p className="map-feedback" role="status">{locationError}</p>}{validLocation(value)?<div className="map-selection" role="status"><Icon name="check" size={15}/><span>Punto seleccionado.{Number.isFinite(value.accuracy)&&<> Precisión aproximada: {Math.round(value.accuracy)} m. Ajusta el marcador si es necesario.</>}<a href={locationLink(value)} target="_blank" rel="noopener noreferrer">Ver punto en Google Maps</a></span></div>:<p className="map-feedback">Todavía no marcaste un punto. La dirección escrita permite continuar.</p>}<small>La tienda confirmará la cobertura de entrega. El punto se incluirá en el mensaje que tú envíes por WhatsApp.</small></section>;
}
