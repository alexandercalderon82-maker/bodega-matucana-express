import Link from 'next/link';
import { assetUrl } from '@/lib/assets';
import { store } from '@/app/products';

export function BrandMark({ className = '', size = 48 }) {
  // eslint-disable-next-line @next/next/no-img-element -- Brand asset is embedded in the portable HTML preview.
  return <img className={`brand-mark ${className}`} width={size} height={size} src={assetUrl('/brand/matumarket-emblema.png')} alt="" aria-hidden="true"/>;
}

export default function Brand({ onClick, dark = false }) {
  return <Link className={`brand ${dark ? 'brand-light' : ''}`} href="/" onClick={onClick} aria-label={`${store.name}, inicio`}><BrandMark /><span className="brand-word">{store.name}<small>TU COMPRA CERCA DE CASA</small></span></Link>;
}
