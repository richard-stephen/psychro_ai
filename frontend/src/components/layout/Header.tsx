import { Button } from '@/components/ui/button';

function LogoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_0_6px_oklch(0.70_0.14_175_/_0.4)]"
    >
      <path
        d="M12 2.5C12 2.5 5.5 11 5.5 15.5C5.5 19.09 8.41 22 12 22C15.59 22 18.5 19.09 18.5 15.5C18.5 11 12 2.5 12 2.5Z"
        fill="rgba(38,70,83,0.15)"
        stroke="rgba(38,70,83,1)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 13h4M10 15.5h4M10 18h4"
        stroke="rgba(38,70,83,0.6)"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Header() {
  return (
    <header className="animate-fade-in flex h-14 shrink-0 items-center justify-between px-5 border-b border-transparent bg-card"
      style={{
        borderImage: 'linear-gradient(90deg, oklch(0.70 0.14 175), oklch(0.88 0.012 210), transparent) 1',
      }}
    >
      <div className="flex items-center gap-2">
        <LogoIcon />
        <span className="text-xl font-bold tracking-tight text-primary">
          Psychro<span className="text-accent"> AI</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          Log In
        </Button>
        <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">
          Sign Up
        </Button>
      </div>
    </header>
  );
}
