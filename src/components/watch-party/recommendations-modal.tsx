'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getRecommendations } from '@/app/actions';
import { type RecommendContentOutput } from '@/ai/flows/recommend-content';
import { Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  watchHistory: z.string().min(1, 'Please enter at least one movie or show.'),
  preferences: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function RecommendationsModal({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RecommendContentOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      watchHistory: '',
      preferences: '',
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await getRecommendations(data);
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setResult(response.data);
      }
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setResult(null);
      setError(null);
      setIsLoading(false);
    }
    setIsOpen(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get AI Recommendations</DialogTitle>
          <DialogDescription>
            Tell us what you've watched and liked. One item per line.
          </DialogDescription>
        </DialogHeader>
        {!result ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="watchHistory">Watch History (required)</Label>
              <Textarea
                id="watchHistory"
                placeholder="e.g. The Matrix&#10;Breaking Bad&#10;Inception"
                className="min-h-[100px]"
                {...form.register('watchHistory')}
              />
              {form.formState.errors.watchHistory && (
                <p className="text-sm text-red-500">{form.formState.errors.watchHistory.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferences">Preferences (optional)</Label>
              <Textarea
                id="preferences"
                placeholder="e.g. Sci-fi, mystery&#10;Mind-bending plots&#10;Strong female leads"
                className="min-h-[100px]"
                {...form.register('preferences')}
              />
            </div>
            {error && (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Get Recommendations
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
            <div className="space-y-4">
                <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary">Our Top Picks For You</h3>
                    <ul className="space-y-2 rounded-md border p-4 list-disc list-inside">
                        {result.recommendations.map((rec, index) => (
                            <li key={index} className="font-medium">{rec}</li>
                        ))}
                    </ul>
                </div>
                 <div>
                    <h3 className="font-semibold text-lg mb-2 text-primary">Why You'll Like These</h3>
                    <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md">{result.reasoning}</p>
                </div>
                <DialogFooter>
                    <Button onClick={() => setResult(null)} variant="outline">Try Again</Button>
                </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
