'use client';

import Error from 'next/error';

export default function GlobalError({
  error: _error,
}: {
  error: Error & { digest?: string };
}) {
  return (
    <html>
      <body>
        <Error statusCode={undefined as any} />
      </body>
    </html>
  );
}
