import crypto from "crypto";
import { exit } from "process";
import { getCookies, getUnixTime } from "./utils";

const header = { alg: "HS256", typ: "JWT" };

// guarantee a secret
const secret = process.env["JWT_SECRET"] || exit(1);

const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64");

export default interface JWT {
    iss: string,
    sub: string,
    aud: string,
    iat: number,
    exp: number,
    [key: string]: string | number | boolean,
};

export function signJWT(payload: { [key: string]: any }) {
    const encodedPayload = Buffer.from(JSON.stringify(payload))
        .toString("base64");
    const signature = crypto.createHmac("sha256", secret)
        .update(encodedHeader + "." + encodedPayload)
        .digest("base64");
    return encodedHeader + "." + encodedPayload + "." + signature;
}

export function verifyJWT(token: string): JWT | undefined {
    const [ encodedHeader, encodedPayload, signature ] = token.split(".");
    const actualSignature = crypto.createHmac("sha256", secret)
        .update(encodedHeader + "." + encodedPayload)
        .digest("base64");

    if (actualSignature == signature) {
        return JSON.parse(Buffer.from(encodedPayload, "base64").toString());
    }
}

export function createJWT(id: string, body: { [key: string]: any }) {
    const time = getUnixTime();
    const payload: JWT = {
        iss: "pepega-board",
        sub: "pepega-board-auth",
        aud: id,
        iat: time,
        exp: time + 2592000,
        ...body,
    };
    return signJWT(payload);
}

/**
 * Verifies a token and also checks if it has expired.
 */
export function authenticateJWT(token: string) {
    if (!token) {
        return undefined;
    }

    const info = verifyJWT(token);
    if (!info || info.sub != "pepega-board-auth") {
        return undefined;
    }

    if (getUnixTime() > info.exp ?? 0) {
        return undefined;
    }

    return info;
}

export function authenticateCookies(headers: any) {
    let cookies = getCookies(headers);
    let jwt = cookies["pb_jwt"];
    let info = authenticateJWT(jwt);
    if (!info) {
        return undefined;
    }
    return info;
}

