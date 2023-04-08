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
