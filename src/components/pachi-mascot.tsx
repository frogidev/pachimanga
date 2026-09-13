export function PachiMascot({className=""}:{className?:string}){
  return <svg viewBox="0 0 240 220" className={className} role="img" aria-label="Pachi, the Pachimanga cat mascot">
    <defs><linearGradient id="pachiBody" x1="0" x2="1"><stop stopColor="#fff1f6"/><stop offset="1" stopColor="#ffd3e1"/></linearGradient></defs>
    <path d="M55 68 44 22l43 30M185 68l11-46-44 31" fill="#2f2736" stroke="#19151e" strokeWidth="8" strokeLinejoin="round"/>
    <path d="m58 53-5-19 21 15m108 4 5-19-22 15" fill="#ff9bbb"/>
    <path d="M48 101c0-48 31-72 72-72s72 24 72 72v42c0 43-29 67-72 67s-72-24-72-67z" fill="url(#pachiBody)" stroke="#19151e" strokeWidth="8"/>
    <path d="M74 83c18-17 29-20 46-20 21 0 34 6 47 20-12-36-80-44-93 0Z" fill="#3b3243"/>
    <ellipse cx="89" cy="119" rx="7" ry="10" fill="#19151e"/><ellipse cx="151" cy="119" rx="7" ry="10" fill="#19151e"/>
    <path d="M111 137c6 6 12 6 18 0" fill="none" stroke="#19151e" strokeWidth="5" strokeLinecap="round"/>
    <path d="M120 130c-5 0-8-3-8-6 0-4 4-6 8-6s8 2 8 6c0 3-3 6-8 6Z" fill="#ff79a5"/>
    <circle cx="74" cy="140" r="13" fill="#ffb2ca" opacity=".7"/><circle cx="166" cy="140" r="13" fill="#ffb2ca" opacity=".7"/>
    <path d="M63 138 28 131m36 20-36 5m148-18 36-7m-36 20 36 5" stroke="#7b667d" strokeWidth="4" strokeLinecap="round"/>
    <path d="M77 169c11 21 75 21 86 0v22c-19 22-67 22-86 0Z" fill="#29222f"/>
    <path d="M110 181h20v22h-20z" fill="#ff6f9f" rx="6"/>
  </svg>
}
