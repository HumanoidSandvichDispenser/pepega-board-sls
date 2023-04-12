import {
    APIGatewayProxyHandler,
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { randomUUID, randomBytes, pbkdf2Sync } from "crypto";
import PepegaDB from "../pepegadb";
import { isValidUsername, getUnixTime } from "../utils";
import { authenticateCookies, createJWT } from "../jwt";
import APIEndpoint from "src/apiendpoint";

const pepegadb = new PepegaDB();

const HOSTNAME = process.env.HOSTNAME;

function hashSalt(name: string, pw: string, salt: string) {
    let fullSalt = name + salt + "gachiGASM";
    return pbkdf2Sync(pw, fullSalt, 77777, 64, "sha512").toString("hex");
};

async function authenticate(username: string, pw: string) {
    if (!username || !pw) {
        return undefined;
    }

    let user = await pepegadb.fetchUser(username);

    if (!user) {
        return undefined;
    }

    const hash = hashSalt(username, pw, user.salt);

    // do not authenticate if password is incorrect
    if (hash != user.pw ?? "") {
        console.log(`Attempted to log into ${username}; attempt = ${hash}`);
        return undefined;
    }

    let token = createJWT(user.PK, { });

    return {
        token,
        id: user.PK,
        username,
        displayName: user.display_name,
    };
};

export const checkAuth: APIEndpoint = async (event) => {
    let cookies = authenticateCookies(event.headers);
    if (!cookies) {
        return {
            statusCode: 401,
            body: "Unauthorized",
        };
    }

    return {
        statusCode: 200,
        body: "",
    };
}

export const login: APIEndpoint = async (event) => {
    const { username, pw } = JSON.parse(event.body as string ?? "{ }");

    if (!username || !pw) {
        return {
            statusCode: 401,
            body: "No username or password supplied",
        };
    }

    const { token, id, displayName } = await authenticate(username, pw) ?? { };
    if (!token) {
        return {
            statusCode: 401,
            body: "Incorrect password",
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            id,
            username: username,
            displayName: displayName,
            token,
        }),
        headers: {
            "Set-Cookie": "pb_jwt=" + token,
        },
    };
}

export const register: APIEndpoint = async (event) => {
    const request = JSON.parse(event.body as string ?? "{}");

    if (!request.username || !request.pw) {
        return {
            statusCode: 400,
            body: "No username/password supplemented",
        };
    }

    request.displayName ??= request.username;

    // must be a valid username
    if (!isValidUsername(request.username)) {
        return {
            statusCode: 400,
            body: "Invalid username",
        };
    }

    if (await pepegadb.fetchUser(request.username) != undefined) {
        return {
            statusCode: 400,
            body: "User already exists",
        };
    }

    const id = "USER_" + randomUUID();
    const salt = randomBytes(16).toString("hex");
    const hash = hashSalt(request.username, request.pw, salt);

    const token = createJWT(id, { });

    // register user in the db
    const item = {
        PK: id,
        SK: id,
        entity: "USER",
        username: request.username,
        display_name: request.displayName,
        pw: hash,
        salt,
        time: getUnixTime(),
    };
    await pepegadb
        .put({
            Item: item,
            TableName: "pepega-board",
        }).promise();

    // clear hash and salt before returning it
    item.pw = item.salt = "";

    return {
        statusCode: 200,
        body: JSON.stringify({
            id,
            username: request.username,
            displayName: request.displayName,
            token,
        }),
        headers: {
            "Set-Cookie": "pb_jwt=" + token,
        },
    };
}
