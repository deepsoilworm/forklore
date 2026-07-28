"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveCharacterAction } from "@/lib/actions/characters";

const FIELDS: { key: "age" | "appearance" | "personality" | "goal" | "relationships"; label: string; placeholder: string }[] = [
  { key: "age", label: "나이", placeholder: "17" },
  { key: "appearance", label: "외모", placeholder: "단발머리, 큰 눈" },
  { key: "personality", label: "성격", placeholder: "호기심 많고 씩씩함" },
  { key: "goal", label: "목표", placeholder: "여우비의 비밀을 알아내기" },
  { key: "relationships", label: "관계", placeholder: "여우와 매년 재회" },
];

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
    age: string | null;
    appearance: string | null;
    personality: string | null;
    goal: string | null;
    relationships: string | null;
    description: string | null;
  };
}) {
  return (
    <form action={saveCharacterAction} className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="slug" value={slug} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">이름</Label>
        <Input id="name" name="name" defaultValue={initial?.name} required placeholder="수아" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex flex-col gap-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <Input
              id={f.key}
              name={f.key}
              defaultValue={initial?.[f.key] ?? ""}
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>

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
