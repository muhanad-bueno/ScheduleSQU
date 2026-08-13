export default function FlagGB({ className }) {
  return (
    <svg viewBox="0 0 32 24" className={className} aria-hidden="true">
      <rect width="32" height="24" fill="#012169"/>
      <path d="M0,0 L32,24 M32,0 L0,24" stroke="#FFFFFF" strokeWidth="4"/>
      <path d="M0,0 L32,24 M32,0 L0,24" stroke="#C8102E" strokeWidth="2"/>
      <path d="M16,0 V24 M0,12 H32" stroke="#FFFFFF" strokeWidth="6"/>
      <path d="M16,0 V24 M0,12 H32" stroke="#C8102E" strokeWidth="4"/>
    </svg>
  );
}
