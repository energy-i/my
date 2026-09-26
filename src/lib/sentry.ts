import * as Sentry from "@sentry/react";

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 1,
    dataCollection: {
      userInfo: true,
      cookies: true,
      httpHeaders: { request: true, response: true },
      httpBodies: [
        "incomingRequest",
        "outgoingRequest",
        "incomingResponse",
        "outgoingResponse",
      ],
      urlQueryParams: true,
      graphQL: { document: true, variables: true },
      genAI: { inputs: true, outputs: true },
      databaseQueryData: true,
      stackFrameVariables: true,
      frameContextLines: 7,
    },
    integrations: [Sentry.browserTracingIntegration()],
  });
}
