
export type QRPayload = {
  v: 1;
  event: string;
  title?: string;
  start?: string;
  end?: string;
};

export function buildQRPayload(event: {
  eventId: string;
  title: string;
  start?: string;
  end?: string;
}): string {
  return JSON.stringify({
    v: 1,
    event: event.eventId.trim(),
    title: event.title,
    ...(event.start ? { start: event.start } : {}),
    ...(event.end ? { end: event.end } : {}),
  } satisfies QRPayload);
}

export type ParseQRResult =
  | { ok: true; payload: QRPayload }
  | { ok: false; message: string };

export function parseQRPayload(raw: string): ParseQRResult {
  if (!raw || !raw.trim()) {
    return { ok: false, message: 'The QR code is empty.' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Invalid QR code format.' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    return { ok: false, message: 'Invalid attendance QR code.' };
  }

  const value = parsed as Record<string, unknown>;

  if (
    value.v !== 1 ||
    typeof value.event !== 'string' ||
    !value.event.trim()
  ) {
    return {
      ok: false,
      message: 'This is not a valid attendance QR code.',
    };
  }

  return {
    ok: true,
    payload: {
      v: 1,
      event: value.event.trim(),
      ...(typeof value.title === 'string'
        ? { title: value.title }
        : {}),
      ...(typeof value.start === 'string'
        ? { start: value.start }
        : {}),
      ...(typeof value.end === 'string'
        ? { end: value.end }
        : {}),
    },
  };
}
