import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatPanel from './ChatPanel';

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {isOpen && <ChatPanel onClose={() => setIsOpen(false)} />}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_4px_20px_oklch(0.70_0.14_175_/_0.3)] transition-transform hover:scale-105 active:scale-95 animate-pulse-glow"
        aria-label="Open AI chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </>
  );
}
