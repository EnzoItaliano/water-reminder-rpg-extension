export function generateUUIDv7() {
    const ts = Date.now();
    const tsHex = ts.toString(16).padStart(12, '0');

    const random = crypto.getRandomValues(new Uint8Array(10));
    const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');

    // UUID v7 format:
    // 00000000-0000-7000-8000-000000000000
    // 8 chars (ts) - 4 chars (ts) - 4 chars (ver + ts/rand) - 4 chars (var + rand) - 12 chars (rand)

    // We need 32 hex digits total (128 bits)
    // v7 uses unix_ts_ms (48 bits)

    const uuid = [
        tsHex.substring(0, 8),
        tsHex.substring(8, 12),
        '7' + randomHex.substring(1, 4), // version 7
        (parseInt(randomHex.substring(4, 5), 16) & 0x3 | 0x8).toString(16) + randomHex.substring(5, 8), // variant 10xx
        randomHex.substring(8, 20)
    ].join('-');

    return uuid;
}
