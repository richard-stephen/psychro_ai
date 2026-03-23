import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ChatPanelProps {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  return (
    <div className="animate-scale-in fixed bottom-20 right-6 z-50 flex w-[350px] flex-col rounded-lg border bg-card shadow-lg shadow-black/10">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="border-l-2 border-accent pl-2 font-semibold">AI Assistant</h3>
        <button
          onClick={onClose}
          className="rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Close chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-lg font-medium">Coming Soon</p>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-powered psychrometric analysis and recommendations will be available here.
        </p>
      </div>

      <div className="border-t px-4 py-3">
        <Input
          disabled
          placeholder="Type a message..."
          className="opacity-50"
        />
      </div>
    </div>
  );
}
