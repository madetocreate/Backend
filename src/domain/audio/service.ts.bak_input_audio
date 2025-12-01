import { openai } from "../../integrations/openai/client";
import { writeMemory } from "../memory/service";

export type IngestAudioInput = {
  tenantId: string;
  sessionId: string;
  externalId: string;
  platform: string;
  from: string;
  audioBase64: string;
  audioMimeType: string;
  channel?: string;
  metadata?: Record<string, unknown>;
};

export type IngestAudioResult = {
  status: "accepted";
  type: "dm";
  tenantId: string;
  normalized: {
    externalId: string;
    platform: string;
    from: string;
    body: string;
    channel: string | null;
    metadata: Record<string, unknown> | null;
    transcriptionSource: string;
  };
};

export async function handleIngestAudio(input: IngestAudioInput): Promise<IngestAudioResult> {
  const buffer = Buffer.from(input.audioBase64, "base64");

  const file = await openai.files.create({
    file: buffer as any,
    purpose: "assistants"
  });

  const response = await openai.responses.create({
    model: "gpt-4o-mini-transcribe",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: "Transkribiere das folgende Audio möglichst wortgetreu in die Sprache der Aufnahme. Gib nur den transkribierten Text ohne zusätzliche Erklärungen zurück."
          },
          {
            type: "input_file",
            file_id: file.id
          }
        ]
      }
    ]
  });

  const transcript = response.output_text ?? "";

  await writeMemory({
    tenantId: input.tenantId,
    type: "dm",
    content: transcript,
    metadata: {
      externalId: input.externalId,
      platform: input.platform,
      from: input.from,
      channel: input.channel ?? null,
      metadata: input.metadata ?? null,
      transcriptionSource: "openai_responses",
      audioMimeType: input.audioMimeType
    },
    sourceId: input.externalId,
    conversationId: input.sessionId,
    createdAt: new Date()
  });

  return {
    status: "accepted",
    type: "dm",
    tenantId: input.tenantId,
    normalized: {
      externalId: input.externalId,
      platform: input.platform,
      from: input.from,
      body: transcript,
      channel: input.channel ?? null,
      metadata: input.metadata ?? null,
      transcriptionSource: "openai_responses"
    }
  };
}
