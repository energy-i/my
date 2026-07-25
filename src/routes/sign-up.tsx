import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { InfoIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { queryKeys } from "@/lib/query-keys";

export const Route = createFileRoute("/sign-up")({
  component: SignUpPage,
});

function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    const data = await signUp.email({
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      name: formData.get("name") as string,
      organisationName: formData.get("organisation") as string,
    } as never);

    if (data.error) {
      setError(data.error.message || "An error occurred during sign in");
      setLoading(false);
    } else {
      toast.success("Account created", {
        description: "Check your email to complete set up",
      });
      // Drop any cached `null` from an earlier `getMe()` call so the
      // `_authed` guard refetches with the fresh session cookie.
      // `removeQueries` deletes the entry; `invalidateQueries` only marks it
      // stale, which `ensureQueryData` ignores.
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
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <CardTitle className="text-2xl font-semibold flex items-center gap-2">
                      <img
                        src="/logo.svg"
                        alt="Energyi Logo"
                        className="h-12 w-auto"
                      />
                      Energy-i
                    </CardTitle>
                    <CardDescription>
                      Sign up to create your account
                    </CardDescription>
                  </div>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <InfoIcon />
                      <AlertTitle>{error}</AlertTitle>
                    </Alert>
                  )}
                  <Field>
                    <FieldLabel htmlFor="name">Full Name</FieldLabel>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Your Full Name"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="organisation">Organisation</FieldLabel>
                    <Input
                      id="organisation"
                      name="organisation"
                      type="text"
                      required
                      placeholder="Your Organisation Name"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="email">Email address</FieldLabel>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      placeholder="••••••••"
                    />
                    <FieldDescription>
                      Must be at least 8 characters
                    </FieldDescription>
                  </Field>

                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? <Loader2 className="animate-spin" /> : ""} Sign
                    up
                  </Button>
                  <FieldDescription className="text-center">
                    Already have an account?{" "}
                    <Link
                      to="/sign-in"
                      className="font-semibold hover:underline"
                    >
                      Sign in
                    </Link>
                  </FieldDescription>
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
          <FieldDescription className="px-6 text-center">
            By continuing, you agree to our{" "}
            <a href="https://www.energy-i.ai/terms">Terms of Service</a>.
          </FieldDescription>
        </div>
      </div>
    </div>
  );
}
