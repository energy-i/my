import { usePostHog } from "@posthog/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteUser } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { User } from "@/lib/types";

const DeleteUserForm = ({ user }: { user: User }) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  const mutation = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: async () => {
      if (posthog) {
        posthog.capture("user_removed");
      }
      toast.success("User deleted", {
        description: `${user.name} has been removed from your organisation.`,
      });
      setIsOpen(false);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.organisationUsers,
      });
    },
    onError: (error) => {
      toast.error("Failed to delete user", {
        description:
          error instanceof Error ? error.message : "Something went wrong.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="destructive">
          {mutation.isPending ? "Deleting..." : "Delete"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {user.name}&#39;s account and remove their data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={mutation.isPending} type="submit">
              Confirm delete
            </Button>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteUserForm;
