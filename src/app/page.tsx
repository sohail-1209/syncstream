import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clapperboard, Users } from 'lucide-react';
import { Logo } from '@/components/icons';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-center items-center gap-4">
          <Logo className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-foreground font-headline tracking-tighter">
          SyncStream
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          Your shared screen, perfectly in sync. Create private watch parties,
          chat in real-time, and get AI-powered recommendations for what to watch
          next.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
           <Button asChild size="lg" className="font-bold text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/watch/session-123">
              <Clapperboard className="mr-2 h-6 w-6" />
              Create Watch Party
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="font-bold text-lg px-8 py-6">
            <Link href="#">
              <Users className="mr-2 h-6 w-6" />
              Join a Session
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
