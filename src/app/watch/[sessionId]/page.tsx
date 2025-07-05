
import WatchPartyClient from '@/components/watch-party/watch-party-client';

// This function is required for static export of dynamic routes.
// It tells Next.js to generate no static pages for this route at build time.
export async function generateStaticParams() {
    return [];
}

// This is now a simple Server Component wrapper.
export default function WatchPartyPage() {
    return <WatchPartyClient />;
}
