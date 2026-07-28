"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveCharacterAction } from "@/lib/actions/characters";

const SUGGESTED_FIELDS = ["나이", "외모", "성격", "목표", "관계"];

export function CharacterForm({
  owner,
  slug,
  initial,
}: {
  owner: string;
  slug: string;
  initial?: {
    id: string;
    name: string;
    description: string | null;
    fields: { label: string; value: string }[];
  };
}) {
  const [fields, setFields] = useState<{ label: string; value: string }[]>(
    initial?.fields.map((f) => ({ label: f.label, value: f.value })) ??
      SUGGESTED_FIELDS.map((label) => ({ label, value: "" })),
  );

  function updateField(i: number, patch: Partial<{ label: string; value: string }>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  function removeField(i: number) {
    setFields((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addField() {
    setFields((prev) => [...prev, { label: "", value: "" }]);
  }

  return (
    <form action={saveCharacterAction} className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="slug" value={slug} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">이름</Label>
        <Input id="name" name="name" defaultValue={initial?.name} required placeholder="수아" />
      </div>

      <div className="flex flex-col gap-2">
        <Label>항목 (나이, 종족, 소속 국가 등 자유롭게 추가/삭제)</Label>
        <div className="flex flex-col gap-2">
          {fields.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label="항목 이름"
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
                placeholder="항목 (예: 종족)"
                className="w-32 shrink-0"
              />
              <Input
                aria-label="값"
                value={f.value}
                onChange={(e) => updateField(i, { value: e.target.value })}
                placeholder="값 (예: 엘프)"
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                className="shrink-0 px-2 text-sm text-muted-foreground hover:text-destructive"
                aria-label="항목 삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addField} className="self-start">
          + 항목 추가
        </Button>
      </div>

      {/* Mirror the field rows into plain inputs the server action can read via getAll. */}
      {fields.map((f, i) => (
        <input key={`label-${i}`} type="hidden" name="fieldLabel" value={f.label} />
      ))}
      {fields.map((f, i) => (
        <input key={`value-${i}`} type="hidden" name="fieldValue" value={f.value} />
      ))}

      <div className="flex flex-col gap-2">
        <Label htmlFor="description">설명</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description ?? ""}
          rows={6}
          placeholder="마을에서 나고 자란 고등학생. 비 오는 날을 유독 좋아한다."
        />
      </div>

      <Button type="submit" className="self-start">
        저장
      </Button>
    </form>
  );
}
