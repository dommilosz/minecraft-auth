import crypto from "crypto";

export function uuid(username:string) {
    let md5Bytes = crypto.createHash('md5').update(username).digest();
    md5Bytes[6] &= 0x0f;
    md5Bytes[6] |= 0x30;
    md5Bytes[8] &= 0x3f;
    md5Bytes[8] |= 0x80;
    return md5Bytes.toString('hex');
}