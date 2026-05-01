console.log("server.js started");

import express from "express";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: "25mb" }));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function generateRakutenAffiliateUrl(keyword) {
  const cleanKeyword = String(keyword || "").trim();

  const affiliateId =
    process.env.RAKUTEN_AFFILIATE_ID ||
    "384c4272.789ff810.384c4273.b29a7259";

  const searchUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(
    cleanKeyword
  )}/`;

  return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(
    searchUrl
  )}&link_type=hybrid_url&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6Imh5YnJpZF91cmwiLCJjb2wiOjF9`;
}

app.get("/", (req, res) => {
  console.log("[GET /] health check");
  res.json({ message: "BeautyAI API is running" });
});

app.post("/analyze-skin", async (req, res) => {
  console.log("[POST /analyze-skin] request received");

  try {
    const {
      frontImageBase64,
      rightImageBase64,
      leftImageBase64,
      mode,
      category,
    } = req.body;

    console.log("[POST /analyze-skin] mode:", mode);
    console.log("[POST /analyze-skin] category:", category);

    if (!frontImageBase64 || !rightImageBase64 || !leftImageBase64) {
      return res.status(400).json({
        error: "frontImageBase64, rightImageBase64, leftImageBase64 が必要です",
      });
    }

    if (!mode) {
      return res.status(400).json({
        error: "mode が必要です",
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "OPENAI_API_KEY が未設定です",
      });
    }

    let prompt = "";

    if (mode === "makeup") {
      prompt = `
あなたはプロの美容アドバイザーです。
これは医療診断ではありません。
ユーザーは「${category || "美容アイテム全般"}」について知りたいと考えています。
3枚の顔画像を見て、似合うメイクや美容アイテムを提案してください。

重要:
- メイク提案に特化してください
- 肌トラブル診断を主軸にしないでください
- パーソナルカラーを必ず推定してください
- 似合う色名を具体的に返してください
- 楽天市場で検索されやすい検索ワードを3つ返してください
- JSON以外は返さないでください

必ず次のJSON形式で返してください:

{
  "summary": "顔立ち・雰囲気・印象を踏まえた総評（120文字以上）",
  "personalColor": "イエベ春 / イエベ秋 / ブルベ夏 / ブルベ冬 のいずれか",
  "recommendedColors": ["似合う色1", "似合う色2", "似合う色3", "似合う色4"],
  "makeupTone": "ナチュラル / 上品 / 華やか / クール など",
  "baseMake": {
    "foundationType": "パウダーファンデ / リキッドファンデ / クッションファンデ",
    "reason": "なぜそのファンデーションタイプが合うのかを具体的に説明"
  },
  "pointMakeup": {
    "lip": "似合うリップの色や質感の提案",
    "cheek": "似合うチークの色や入れ方の提案",
    "eye": "似合うアイメイクの色や雰囲気の提案"
  },
  "itemAdvice": "その人に合う美容アイテム選びの方向性を150文字以上で具体的に説明",
  "rakutenSearchKeywords": [
    "楽天市場で検索されやすい美容検索ワード1",
    "楽天市場で検索されやすい美容検索ワード2",
    "楽天市場で検索されやすい美容検索ワード3"
  ],
  "notes": ["補足1", "補足2", "補足3"]
}
`;
    } else if (mode === "skin") {
      prompt = `
あなたはプロのスキンケアアドバイザーです。
これは医療診断ではなく一般的な美容分析です。
ユーザーは「${category || "肌状態全般"}」について知りたいと考えています。
3枚の顔画像を見て、肌の状態と改善アドバイスを返してください。

重要:
- ニキビだけに偏らないでください
- 「乾燥」「毛穴」「シミ・色ムラ」「肌の質感」を必ず含めてください
- 「皮脂・テカリ」は独立項目として返さないでください
- 「周期」「ホルモンバランス」は返さないでください
- 具体的なケア方法を必ず返してください
- 楽天市場で検索されやすい検索ワードを3つ返してください
- JSON以外は返さないでください

必ず次のJSON形式で返してください:

{
  "summary": "肌全体の総評を150文字以上で具体的に説明",
  "skinType": "乾燥肌 / 脂性肌 / 混合肌 / 普通肌",
  "dryness": {
    "level": "低い / やや低い / 普通 / やや高い / 高い",
    "description": "乾燥傾向の具体的な説明"
  },
  "pores": {
    "level": "低い / やや低い / 普通 / やや高い / 高い",
    "description": "毛穴の状態についての説明"
  },
  "spots": {
    "level": "低い / やや低い / 普通 / やや高い / 高い",
    "description": "シミ・色ムラ・くすみの傾向についての説明"
  },
  "texture": {
    "type": "なめらか / ややざらつき / ざらつき / ごわつき など",
    "description": "肌の質感の説明"
  },
  "careRoutine": [
    "朝に行う具体的なケア",
    "夜に行う具体的なケア",
    "週1回程度行う具体的なケア"
  ],
  "avoidActions": [
    "避けた方がいい行動1",
    "避けた方がいい行動2"
  ],
  "careAdvice": "スキンケアの方向性を200文字以上で具体的に説明",
  "rakutenSearchKeywords": [
    "楽天市場で検索されやすいスキンケア検索ワード1",
    "楽天市場で検索されやすいスキンケア検索ワード2",
    "楽天市場で検索されやすいスキンケア検索ワード3"
  ],
  "notes": ["補足1", "補足2", "補足3"]
}
`;
    } else {
      return res.status(400).json({
        error: "mode は makeup または skin を指定してください",
      });
    }

    console.log("[POST /analyze-skin] sending request to OpenAI...");

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${frontImageBase64}`,
                detail: "low",
              },
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${rightImageBase64}`,
                detail: "low",
              },
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${leftImageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    console.log("[POST /analyze-skin] OpenAI response received");

    const content = response.choices?.[0]?.message?.content ?? "{}";
    console.log("[POST /analyze-skin] raw content:", content);

    const parsed = JSON.parse(content);

    const keywords = Array.isArray(parsed.rakutenSearchKeywords)
      ? parsed.rakutenSearchKeywords
      : [];

    parsed.recommendedItems = keywords.map((keyword) => ({
      name: keyword,
      reason: `診断結果に合わせて「${keyword}」で楽天市場の商品を探せます。肌状態や目的に合う商品を比較して選んでください。`,
      amazonUrl: "",
      rakutenUrl: generateRakutenAffiliateUrl(keyword),
    }));

    delete parsed.rakutenSearchKeywords;

    res.json(parsed);
  } catch (error) {
    console.error("[POST /analyze-skin] error:", error);

    res.status(error?.status || 500).json({
      error: error?.error?.message || error?.message || "解析に失敗しました",
      code: error?.code || null,
      type: error?.type || null,
    });
  }
});

const port = process.env.PORT || 3000;
const host = "0.0.0.0";

console.log("before app.listen");

app.listen(port, host, () => {
  console.log(`BeautyAI API running on http://${host}:${port}`);
});