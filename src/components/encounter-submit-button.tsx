"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// createEncounterAction requires at least one participant server-side, but
// a plain checkbox group can't express that with the `required` attribute
// (it only supports "all checked", not "at least one") — so unchecked
// submissions silently threw with no feedback. Validate it client-side.
export function EncounterSubmitButton() {
  const [error, setError] = useState(false);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button
        type="submit"
        size="sm"
        className="self-start"
        onClick={(e) => {
          const form = e.currentTarget.closest("form");
          const checked = form?.querySelectorAll('input[name="participantIds"]:checked').length ?? 0;
          if (checked === 0) {
            e.preventDefault();
            setError(true);
          } else {
            setError(false);
          }
        }}
      >
        만남 추가
      </Button>
      {error && <p className="text-xs text-destructive">참여 인물을 한 명 이상 선택해주세요</p>}
    </div>
  );
}
