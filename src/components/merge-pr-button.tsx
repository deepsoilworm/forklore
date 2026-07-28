"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mergePullRequestAction } from "@/lib/actions/pulls";

export function MergePrButton({
  owner,
  slug,
  number,
}: {
  owner: string;
  slug: string;
  number: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const formData = new FormData();
          formData.set("owner", owner);
          formData.set("slug", slug);
          formData.set("number", String(number));
          const result = await mergePullRequestAction(formData);
          if (result.status === "conflict") {
            toast.error(
              `병합 충돌이 발생했어요: ${result.conflicts.join(", ")}`,
            );
          } else {
            toast.success("병합했어요");
            router.refresh();
          }
        })
      }
    >
      {pending ? "병합 중..." : "병합하기"}
    </Button>
  );
}
