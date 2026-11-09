import { getAccessToken } from "../auth/session";
import { IS_MOCK, API_BASE_URL } from "../env";
import { getSupabase } from "../supabase";
import { apiFetch, ApiError } from "./client";

export type RecipeStep = {
  order: number;
  title: string;
  description: string;
  image_url: string | null;
  tip: string | null;
  is_key_step: boolean;
};
export type RecipeDetail = {
  recipe_id: string;
  title: string;
  hero_image_url: string | null;
  transmitter_id: string;
  transmitter_name: string;
  transmitter_avatar_url?: string | null;
  transmitter_region?: string | null;
  transmitter_quote: string | null;
  context_summary: string;
  voice_message_url: string | null;
  cooking_time: number;
  difficulty: "쉬움" | "보통" | "어려움";
  servings: number;
  like_count: number;
  save_count: number;
  is_liked: boolean;
  is_saved: boolean;
  ingredients: Array<{
    name: string;
    amount: number | null;
    unit: string | null;
    note: string | null;
  }>;
  steps: RecipeStep[];
  version: number;
  updated_at: string;
};
export type RecipeListItem = {
  recipe_id: string;
  title: string;
  hero_image_url: string | null;
  transmitter_name: string;
  region: string;
  like_count: number;
  created_at: string;
};
export type RecipeListResponse = {
  recipes: RecipeListItem[];
  next_cursor: string | null;
};
export type RecommendationItem = {
  recipe_id: string;
  title: string;
  hero_image_url: string | null;
  region_tag: string;
  transmitter_quote: string;
};
export type AnalysisResult = {
  structured: {
    ingredients: Array<{ name: string; amount?: number; unit?: string }>;
    steps: Array<{
      order: number;
      action: string;
      sensory_expressions: string[];
    }>;
    context: { occasion?: string; for_whom?: string; season?: string };
  };
  questions: Array<{
    expression: string;
    question: string;
    options: string[];
    already_known: boolean;
  }>;
  auto_applied: Array<{ expression: string; applied_value: unknown }>;
};
export type ChatEvent = {
  event: "chunk" | "audio" | "done" | "error";
  data: Record<string, unknown>;
};

const mockDetail: RecipeDetail = {
  recipe_id: "r-daegu-yukgaejang",
  title: "대구식 육개장",
  hero_image_url: "/images/daegu-yukgaejang.png",
  transmitter_id: "u-kim-hansul",
  transmitter_name: "박순덕",
  transmitter_quote: "대파를 넉넉히 넣어 끓여요.",
  context_summary:
    "소고기와 대파를 넉넉히 넣고 얼큰하게 끓이는 대구식 육개장입니다.",
  voice_message_url: null,
  cooking_time: 40,
  difficulty: "보통",
  servings: 4,
  like_count: 162,
  save_count: 102,
  is_liked: false,
  is_saved: false,
  ingredients: [
    { name: "소고기", amount: 300, unit: "g", note: null },
    { name: "대파", amount: 2, unit: "대", note: "넉넉히" },
  ],
  steps: [
    {
      order: 1,
      title: "재료 손질하기",
      description:
        "소고기는 키친타월로 핏물을 닦고, 무와 대파는 먹기 좋은 크기로 썰어주세요.",
      image_url: null,
      tip: "재료의 크기를 비슷하게 맞추면 고르게 익어요.",
      is_key_step: false,
    },
    {
      order: 2,
      title: "소고기 볶기",
      description:
        "냄비에 참기름을 두르고 소고기를 넣어 겉면이 익을 때까지 볶아주세요.",
      image_url: null,
      tip: null,
      is_key_step: false,
    },
    {
      order: 3,
      title: "무 넣고 끓이기",
      description: "무와 물을 넣고 끓이면서 떠오르는 거품을 걷어내 주세요.",
      image_url: null,
      tip: null,
      is_key_step: false,
    },
    {
      order: 4,
      title: "고춧가루 넣고 끓이기",
      description:
        "고춧가루와 대파를 넣고 약불에서 재료가 부드러워질 때까지 끓여요.",
      image_url: null,
      tip: null,
      is_key_step: true,
    },
  ],
  version: 1,
  updated_at: new Date(0).toISOString(),
};

export async function getRecipes(
  cursor = "",
  limit = 20,
  regionCode?: string,
  sort = "popular",
): Promise<RecipeListResponse> {
  if (IS_MOCK)
    return {
      recipes: [
        {
          recipe_id: mockDetail.recipe_id,
          title: mockDetail.title,
          hero_image_url: mockDetail.hero_image_url,
          transmitter_name: mockDetail.transmitter_name,
          region: "대구광역시",
          like_count: mockDetail.like_count,
          created_at: mockDetail.updated_at,
        },
      ],
      next_cursor: null,
    };
  const params = new URLSearchParams({ cursor, limit: String(limit), sort });
  if (regionCode) params.set("region_code", regionCode);
  return apiFetch(`/api/recipes?${params}`);
}
export async function getRecommendations(
  limit = 10,
): Promise<{ recipes: RecommendationItem[] }> {
  if (IS_MOCK)
    return {
      recipes: [
        {
          recipe_id: mockDetail.recipe_id,
          title: mockDetail.title,
          hero_image_url: mockDetail.hero_image_url,
          region_tag: "대구 향토음식",
          transmitter_quote: mockDetail.transmitter_quote ?? "",
        },
      ],
    };
  return apiFetch(
    `/api/recommendations?${new URLSearchParams({ limit: String(limit) })}`,
  );
}
export async function getRecipe(id: string): Promise<RecipeDetail> {
  return IS_MOCK
    ? { ...mockDetail, recipe_id: id }
    : apiFetch(`/api/recipes/${encodeURIComponent(id)}`);
}
export async function toggleRecipe(id: string, action: "like" | "save") {
  if (IS_MOCK)
    return {
      recipe_id: id,
      liked: action === "like",
      saved: action === "save",
      like_count: mockDetail.like_count,
      save_count: mockDetail.save_count,
    };
  return apiFetch<{
    recipe_id: string;
    liked: boolean;
    saved: boolean;
    like_count: number;
    save_count: number;
  }>(`/api/recipes/${encodeURIComponent(id)}/${action}`, { method: "POST" });
}
export type PublishedRecipe = {
  recipe_id: string;
  status: "published";
  context_summary: string;
  transmitter_quote: string | null;
  voice_message_url: string | null;
};

export async function createRecipe(recipeId: string, transmitterQuote?: string): Promise<PublishedRecipe> {
  const quote = transmitterQuote?.trim();
  const body = { recipe_id: recipeId, ...(quote ? { transmitter_quote: quote } : {}) };
  return IS_MOCK
    ? {
        recipe_id: recipeId,
        status: "published",
        context_summary: "",
        transmitter_quote: quote || null,
        voice_message_url: null,
      }
    : apiFetch<PublishedRecipe>("/api/recipes", { method: "POST", json: body });
}
export async function generateStepImages(recipeId: string) {
  return IS_MOCK
    ? { generated: [], failed_orders: [] as number[] }
    : apiFetch<{
        generated: Array<{
          order: number;
          image_url: string;
          prompt_used: string;
        }>;
        failed_orders: number[];
      }>("/api/steps/images", {
        method: "POST",
        json: { recipe_id: recipeId },
      });
}
export async function analyzeRecipe(recipeId: string) {
  return IS_MOCK
    ? ({
        structured: { ingredients: [], steps: [], context: {} },
        questions: [],
        auto_applied: [],
      } as AnalysisResult)
    : apiFetch<AnalysisResult>("/api/analyze", {
        method: "POST",
        json: { recipe_id: recipeId },
      });
}
export async function transcribe(
  body:
    | { transcript: string; recipe_id?: string }
    | { audio_path: string; recipe_id?: string },
) {
  return IS_MOCK
    ? {
        transcript: "transcript" in body ? body.transcript : "",
        recipe_id: body.recipe_id ?? "draft-mock",
        status: "draft",
      }
    : apiFetch<{ transcript: string; recipe_id: string; status: "draft" }>(
        "/api/stt",
        { method: "POST", json: body },
      );
}
export async function vectorizeSensoryProfile() {
  return IS_MOCK
    ? {
        profile_summary: "",
        dimensions: {
          salt_intensity: 0,
          liquid_reduction: 0,
          sweet_ratio: 0,
          browning_preference: 0,
          spice_tolerance: 0,
        },
        vector_updated: false,
      }
    : apiFetch("/api/sensory/vectorize", { method: "POST", json: {} });
}
export async function uploadSignedFile(
  file: File,
  purpose:
    | "stt_audio"
    | "chat_image",
  recipeId?: string,
) {
  if (IS_MOCK)
    return { bucket: "mock", path: `${purpose}/${file.name}`, token: "mock" };
  const signed = await apiFetch<{
    bucket: string;
    path: string;
    token: string;
  }>("/api/uploads/sign", {
    method: "POST",
    json: {
      purpose,
      content_type: file.type,
      size_bytes: file.size,
      ...(recipeId ? { recipe_id: recipeId } : {}),
    },
  });
  const { error } = await getSupabase()
    .storage.from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });
  if (error)
    throw new ApiError(500, "STORAGE_ERROR", "파일을 올리지 못했어요.");
  return signed;
}
export async function sendRecipeChat(
  body: {
    recipe_id: string;
    message: string;
    image_path?: string;
    tts?: boolean;
  },
  onEvent: (event: ChatEvent) => void,
) {
  if (IS_MOCK) {
    onEvent({
      event: "chunk",
      data: { text: "이야기를 잘 들었어요. 재료와 조리 순서로 정리해볼게요." },
    });
    onEvent({ event: "done", data: { message_id: "mock" } });
    return;
  }
  await streamSse("/api/chat", body, onEvent);
}
async function streamSse(
  path: string,
  body: unknown,
  onEvent: (event: ChatEvent) => void,
) {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
    };
    throw new ApiError(
      response.status,
      json.code ?? `HTTP_${response.status}`,
      json.message ?? "요청을 처리하지 못했어요.",
    );
  }
  if (!response.body)
    throw new ApiError(
      response.status,
      "INVALID_RESPONSE",
      "스트리밍 응답을 읽을 수 없어요.",
    );
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    for (const block of blocks) {
      const type = block.match(/^event:\s*(.+)$/m)?.[1]?.trim() as
        | ChatEvent["event"]
        | undefined;
      const data = block.match(/^data:\s*(.+)$/m)?.[1];
      if (!type || !data) continue;
      try {
        onEvent({
          event: type,
          data: JSON.parse(data) as Record<string, unknown>,
        });
      } catch {
        /* ignore malformed SSE frame */
      }
    }
    if (done) break;
  }
}
