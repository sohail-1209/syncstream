
'use client';

import { useState, useEffect } from 'react';
import { useToast } from './use-toast';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
        toast({
            variant: 'destructive',
            title: 'Installation Not Available',
            description: 'Your browser may not support installation, or the app might already be installed.'
        });
        return;
    };
    
    await installPrompt.prompt();
    
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
        toast({
            title: 'Installation Complete!',
            description: 'The app has been added to your home screen.'
        });
    } else {
        // Silently fail if dismissed, as it's a common user action.
    }
    setInstallPrompt(null);
  };

  return { canInstall: !!installPrompt, handleInstall };
}
