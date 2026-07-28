import { auth } from "@/auth";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { streamText } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";

export const maxDuration = 60;

const schema = z.object({
  novelId: z.string().uuid().optional(),
  kind: z.enum(["continue", "suggest", "critique"]),
  content: z.string().max(20_000),
});

const systemPrompts: Record<string, string> = {
  continue:
    "당신은 이야기 집필을 돕는 어시스턴트입니다. 주어진 원고의 문체와 어조를 유지하며, 다음 내용을 2~4문단으로 자연스럽게 이어 쓰세요. 설명 없이 이어지는 본문만 출력하세요.",
  suggest:
    "당신은 이야기 집필 코치입니다. 주어진 원고를 읽고 전개, 캐릭터, 문장 표현 측면에서 구체적인 개선 아이디어를 3~5개 bullet로 제안하세요.",
  critique:
    "당신은 냉정하지만 건설적인 편집자입니다. 주어진 원고의 강점과 약점을 분석하고, 개선이 필요한 부분을 구체적으로 지적하세요.",
};

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("로그인이 필요합니다", { status: 401 });
  }

  const body = schema.parse(await req.json());

  const result = streamText({
    model: "anthropic/claude-sonnet-5",
    system: systemPrompts[body.kind],
    prompt: body.content,
    onFinish: async ({ usage }) => {
      await db.insert(aiUsage).values({
        userId: session.user.id,
        novelId: body.novelId,
        kind: body.kind,
        tokensUsed: usage.totalTokens ?? 0,
      });
    },
  });

  return result.toTextStreamResponse();
}
