import Header from './Header';
import Sidebar from './Sidebar';
import ChatButton from '@/components/chat/ChatButton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen flex-col">
      <Header />
      <div className="flex flex-1 min-h-0 max-md:flex-col">
        <Sidebar />
        <main className="flex-1 min-w-0 bg-grid">{children}</main>
      </div>
      <ChatButton />
    </div>
  );
}
