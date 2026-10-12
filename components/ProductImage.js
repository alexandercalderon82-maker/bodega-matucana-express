/* eslint-disable @next/next/no-img-element -- Editable catalogue images and portable offline preview. */
'use client';
import { useState } from 'react';
import Icon from './Icons';
import { assetUrl } from '@/lib/assets';

export default function ProductImage({ src, name, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className={`image-fallback ${className}`} role="img" aria-label={`${name}: sin imagen`}><Icon name="photo" size={40}/></span>;
  return <img className={className} src={assetUrl(src)} alt={name} loading="lazy" onError={() => setFailed(true)} />;
}
