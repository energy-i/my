import { usePostHog } from "@posthog/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { InfoIcon, Loader2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth-client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const posthog = usePostHog();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const { error } = await requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (error) {
      setError(error.message || "An error occurred");
    } else {
      if (posthog) {
        posthog.capture("password_reset_requested");
      }
      setSuccess(true);
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="p-6 md:p-8">
                {success ? (
                  <div className="flex flex-col gap-4 text-center">
                    <h1 className="text-2xl font-semibold">Check your email</h1>
                    <p className="text-muted-foreground">
                      If an account exists with that email, we&apos;ve sent a
                      password reset link.
                    </p>
                    <Link
                      to="/sign-in"
                      className="text-sm underline-offset-2 hover:underline"
                    >
                      Back to sign in
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <FieldGroup>
                      <div className="flex flex-col items-center gap-2 text-center">
                        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                          <img
                            src="/logo.svg"
                            alt="Energyi Logo"
                            className="h-12 w-auto"
                          />
                          Energy-i
                        </CardTitle>
                        <p className="text-balance text-muted-foreground">
                          Enter your email and we&apos;ll send you a reset link
                        </p>
                      </div>
                      {error && (
                        <Alert variant="destructive" className="mb-4">
                          <InfoIcon />
                          <AlertTitle>{error}</AlertTitle>
                        </Alert>
                      )}
                      <Field>
                        <FieldLabel htmlFor="email">Email</FieldLabel>
                        <Input
                          id="email"
                          type="email"
                          name="email"
                          placeholder="you@example.com"
                          required
                        />
                      </Field>
                      <Field>
                        <Button disabled={loading} type="submit">
                          {loading && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}{" "}
                          Send reset link
                        </Button>
                      </Field>
                      <FieldDescription className="text-center">
                        <Link
                          to="/sign-in"
                          className="text-sm underline-offset-2 hover:underline"
                        >
                          Back to sign in
                        </Link>
                      </FieldDescription>
                    </FieldGroup>
                  </form>
                )}
              </div>
              <div className="relative hidden bg-muted md:block">
                <img
                  src="/renewable-energy.webp"
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-50"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-primary mix-blend-color blur-2xl"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
