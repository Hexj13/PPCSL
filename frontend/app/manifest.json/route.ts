import manifest from '../manifest';

export async function GET() {
  return Response.json(await manifest(), {
    headers: {
      'Content-Type': 'application/manifest+json',
    },
  });
}
