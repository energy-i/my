import { usePostHog } from "@posthog/react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { InfoIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import * as z from "zod";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search) => searchSchema.parse(search),
  component: SignInPage,
});

function SignInPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = await signIn.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    });

    if (data.error) {
      setError(data.error.message || "An error occurred during sign in");
      setLoading(false);
    } else {
      if (posthog && data.data?.user) {
        posthog.identify(data.data.user.id, {
          name: data.data.user.name,
          email: data.data.user.email,
        });
        posthog.capture("user_signed_in");
      }
      // Drop the cached `null` from the pre-login `getMe()` check so the
      // `_authed` guard refetches with the fresh session cookie instead of
      // bouncing us straight back to /sign-in. `removeQueries` deletes the
      // cache entry entirely; `invalidateQueries` only marks it stale, which
      // `ensureQueryData` ignores.
      queryClient.removeQueries({ queryKey: queryKeys.me });
      navigate({ to: "/" });
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <div className="p-6 md:p-8">
                <form onSubmit={handleSignIn}>
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
                      <CardDescription>Sign in to your account</CardDescription>
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
                      <div className="flex items-center">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <Link
                          to="/forgot-password"
                          className="ml-auto text-sm underline-offset-2 hover:underline"
                        >
                          Forgot your password?
                        </Link>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        name="password"
                        required
                      />
                    </Field>
                    <Field>
                      <Button disabled={loading} type="submit">
                        {loading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}{" "}
                        Sign in
                      </Button>
                    </Field>
                    <FieldDescription className="text-center">
                      Don&apos;t have an account?{" "}
                      <Link to="/sign-up">Sign up</Link>
                    </FieldDescription>
                  </FieldGroup>
                </form>
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
