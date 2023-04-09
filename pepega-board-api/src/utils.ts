export function isValidUsername(username: string): boolean {
    // check if length is good enough
    if (username.length <= 0 || username.length > 32) {
        return false;
    }

    // alphanumeric and underscores only
    return /^[a-zA-Z0-9_]*$/gm.test(username);
}

export function getUnixTime(): number {
    return Math.floor(new Date().getTime() / 1000);
}

export function getCookies(headers: any) {
    if (!headers || !headers.Cookie) {
        return { };
    }

    let cookies: { [key: string]: string } = { };
    let cookiesStr: string = headers.Cookie;

    cookiesStr?.split(";").forEach((cookie) => {
        let kv = cookie.split("=");
        let key = kv.shift()?.trim();
        let val = decodeURI(kv.join("="));
        if (key && key != "") {
            cookies[key] = val;
        }
    });

    return cookies;
}
