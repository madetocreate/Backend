import { openai } from "../../integrations/openai/client";
import { writeMemory } from "../memory/service";

export type IngestAudioInput = {
  tenantId: string;
  sessionId?: string;
  externalId?: string;
  platform?: string;
  from?: string;
  audioBase64: string;
  audioMimeType: string;
  channel?: string;
  metadata?: Record<string, unknown>;
};

export async function handleIngestAudio(input: IngestAudioInput) {
  const {
    tenantId,
    audioBase64,
    audioMimeType,
    externalId,
    platform,
    from,
    channel,
    metadata,
  } = input;

  const audioBuffer = Buffer.from(audioBase64, "base64");

  const transcription = await openai.audio.transcriptions.create({
    model: "gpt-4o-mini-transcribe",
    file: audioBuffer,
    response_format: "text",
  } as any);

  const text = transcription as unknown as string;

  await writeMemory({
    tenantId,
    type: "dm",
    content: text,
    metadata: {
      source: "audio_ingest",
      audioMimeType,
      externalId,
      platform,
      from,
      channel,
      ...(metadata ?? {}),
    },
  });

  return {
    tenantId,
    transcript: text,
  };
}
