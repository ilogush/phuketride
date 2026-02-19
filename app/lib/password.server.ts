const PASSWORD_ALGO = "pbkdf2" as const;
const PASSWORD_HASH = "sha256" as const;
const PBKDF2_ITERATIONS = 210_000;
const DK_LEN_BYTES = 32;

function bytesToBase64(bytes: Uint8Array): string {
    // Node (dev) path
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof Buffer !== "undefined") {
        return Buffer.from(bytes).toString("base64");
    }

    // Worker path
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    // eslint-disable-next-line no-undef
    return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (typeof Buffer !== "undefined") {
        return new Uint8Array(Buffer.from(b64, "base64"));
    }

    // eslint-disable-next-line no-undef
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
    );

    const bits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
        keyMaterial,
        DK_LEN_BYTES * 8
    );

    return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const dk = await deriveKey(password, salt, PBKDF2_ITERATIONS);

    return [
        PASSWORD_ALGO,
        PASSWORD_HASH,
        String(PBKDF2_ITERATIONS),
        bytesToBase64(salt),
        bytesToBase64(dk),
    ].join("$");
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
    try {
        const parts = stored.split("$");
        if (parts.length !== 5) return false;

        const [algo, hash, iterStr, saltB64, dkB64] = parts;
        if (algo !== PASSWORD_ALGO) return false;
        if (hash !== PASSWORD_HASH) return false;

        const iterations = Number(iterStr);
        if (!Number.isFinite(iterations) || iterations < 10_000) return false;

        const salt = base64ToBytes(saltB64);
        const expected = base64ToBytes(dkB64);

        const actual = await deriveKey(password, salt, iterations);
        return timingSafeEqual(actual, expected);
    } catch {
        return false;
    }
}
