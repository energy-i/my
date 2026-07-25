import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import * as z from "zod";

import { Card, CardContent } from "@/components/ui/card";
import { FieldDescription } from "@/components/ui/field";
import { verifyEmail } from "@/lib/auth-client";

const searchSchema = z.object({
  token: z.string().optional(),
});

export const Route = createFileRoute("/verify-email")({
  validateSearch: (search) => searchSchema.parse(search),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = useNavigate();
  const hasRunRef = useRef(false);
  const { token } = Route.useSearch();

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    (async () => {
      if (!token) {
        toast.error("Invalid or missing verification token");
        navigate({ to: "/sign-in", replace: true });
        return;
      }

      const { error } = await verifyEmail({ query: { token } });

      if (error) {
        toast.error(error.message || "Unable to verify email");
        navigate({ to: "/sign-in", replace: true });
        return;
      }

      navigate({ to: "/", replace: true });
    })();
  }, [token, navigate]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <div className="flex flex-col gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="p-6 md:p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
