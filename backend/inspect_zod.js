import { z } from 'zod';

const schema = z.object({
  body: z.object({
    name: z.string().min(2)
  })
});

try {
  schema.parse({ body: { name: 'A' } });
} catch (e) {
  console.log('instanceof ZodError:', e instanceof z.ZodError);
  console.log('errors exists:', !!e.errors);
  console.log('issues exists:', !!e.issues);
  console.log('errors:', e.errors);
  console.log('issues:', e.issues);
}
