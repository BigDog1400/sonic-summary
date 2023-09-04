import { AstroSite, StackContext, use } from 'sst/constructs';
import { API } from './MyStack';

export function Fronted({ stack }: StackContext) {
  // ... existing constructs
  const { api } = use(API);

  // Create the Astro site
  const site = new AstroSite(stack, 'Site', {
    path: 'fronted-astro',
    environment: {
      PUBLIC_API_URL: api.url,
    },
  });

  // Add the site's URL to stack output
  stack.addOutputs({
    URL: site.url,
  });
}
