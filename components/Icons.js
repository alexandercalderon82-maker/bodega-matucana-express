export default function Icon({ name, size = 20, ...props }) {
  const paths = {
    bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6"/></>,
    pin: <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/></>,
    truck: <><path d="M2 5h12v12H2V5ZM14 9h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    leaf: <><path d="M20 3C8 3 3 7 5 14s12 8 15-11Z"/><path d="m4 21 11-12"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    settings: <><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 8h8M8 12h8M8 16h4"/></>,
    logout: <><path d="M10 4H4v16h6M13 12h8m-4-4 4 4-4 4"/></>,
    photo: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 17 6-6 4 4 3-3 5 5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.bag}</svg>;
}
