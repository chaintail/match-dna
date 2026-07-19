export interface SseMessage {
  event?: string;
  id?: string;
  retry?: number;
  data: string;
}
export function parseSseChunk(chunk: string): { messages: SseMessage[]; remainder: string } {
  const normalized = chunk.replaceAll("\r\n", "\n");
  const blocks = normalized.split("\n\n");
  const remainder = blocks.pop() ?? "";
  const messages = blocks
    .map((block) => {
      const data: string[] = [];
      const message: SseMessage = { data: "" };
      for (const line of block.split("\n")) {
        if (!line || line.startsWith(":")) continue;
        const colon = line.indexOf(":");
        const field = colon === -1 ? line : line.slice(0, colon);
        const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "data") data.push(value);
        else if (field === "event") message.event = value;
        else if (field === "id") message.id = value;
        else if (field === "retry" && Number.isFinite(Number(value))) message.retry = Number(value);
      }
      message.data = data.join("\n");
      return message;
    })
    .filter((message) => message.data || message.event);
  return { messages, remainder };
}
export async function* parseSseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseSseChunk(buffer);
      buffer = parsed.remainder;
      for (const message of parsed.messages) yield message;
    }
    buffer += decoder.decode();
    if (buffer.trim()) {
      const parsed = parseSseChunk(`${buffer}\n\n`);
      for (const message of parsed.messages) yield message;
    }
  } finally {
    reader.releaseLock();
  }
}
