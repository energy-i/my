import { usePostHog } from "@posthog/react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { signOut } from "@/lib/auth-client";

const SignOutButton = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return (
    <button
      onClick={() => {
        if (posthog) {
          posthog.capture("user_signed_out");
          posthog.reset();
        }
        signOut({
          fetchOptions: {
            onSuccess: () => {
              // Wipe every cached query so the next user doesn't see the
              // previous user's data (and the `_authed` guard refetches
              // `me` cleanly on the next sign-in).
              queryClient.clear();
              navigate({ to: "/sign-in" });
            },
          },
        });
      }}
    >
      Sign out
    </button>
  );
};

export default SignOutButton;
