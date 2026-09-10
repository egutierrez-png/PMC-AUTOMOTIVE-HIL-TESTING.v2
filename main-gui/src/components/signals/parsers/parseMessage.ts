import { parseStatus } from "./parseStatus";
import { parseResults } from "./parseResults";
import { parseCANFrame } from "./parseCAN";

export function parseIncomingMessage(topic: string, payload: Buffer) {
  const text = payload.toString();

  // STATUS
  if (topic.endsWith("/status")) {
    try {
      const obj = JSON.parse(text);
      parseStatus(obj);
    } catch {
      // si truena el parseo, lo ignoramos
    }
  }

  // RESULTS
  else if (topic.endsWith("/results")) {
    try {
      const obj = JSON.parse(text);
      parseResults(obj);
    } catch {
      // ignore
    }
  }

  // RAW CAN
  else if (topic.endsWith("/log/raw_can")) {
    try {
      const frame = JSON.parse(text); // { id, data: [...] }
      parseCANFrame(frame);
    } catch {
      // ignore
    }
  }

  // En el futuro: /log/uart → parseUART(...)
}
