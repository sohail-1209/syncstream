
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
      console.log('`beforeinstallprompt` event has fired.');
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    console.log('Install button clicked. Current install prompt:', installPrompt);
    if (!installPrompt) {
        toast({
            variant: 'destructive',
            title: 'Installation Not Available',
            description: 'The app is not ready to be installed. This might be because your browser does not support it, or it is already installed.'
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
    }
    setInstallPrompt(null);
  };

  return { handleInstall };
}
