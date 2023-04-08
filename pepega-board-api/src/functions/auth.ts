import {
    APIGatewayProxyHandler,
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import { randomUUID, randomBytes, pbkdf2Sync } from "crypto";
import PepegaDB from "../pepegadb";
import { isValidUsername, getUnixTime } from "../utils";

const pepegadb = new PepegaDB();

async function hashSalt(name: string, pw: string, salt: string) {
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

    const hash = await hashSalt(username, pw, user.salt);

    // do not authenticate if password is incorrect
    if (hash != user.pw ?? "") {
        console.log(`Attempted to log into ${username}; attempt = ${hash}`);
        return undefined;
    }

    let token = randomBytes(32).toString("hex");

    // expires in 7776000 seconds (90 days)
    let expirary = getUnixTime() + 7776000;

    const item = {
        PK: user.PK,
        SK: "AUTH#" + token,
        entity: "AUTH",
        expirary,
    };

    // push token to DB
    // "await" to ensure that the item is put in the DB
    await pepegadb
        .put({
            TableName: "pepega-board",
            Item: item,
        }).promise();

    return {
        id: user.PK,
        token,
    };
};

export const login: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    const { username, pw } = JSON.parse(event.body as string ?? "{ }");

    if (!username || !pw) {
        return {
            statusCode: 401,
            body: "No username or password supplied",
        };
    }

    const { id, token } = await authenticate(username, pw) || { };
    if (!token) {
        return {
            statusCode: 401,
            body: "Incorrect password",
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            token,
        }),
        multiValueHeaders: {
            "Set-Cookie": [
                "pepegaboard_auth=" + token,
                "pepegaboard_user=" + id,
            ],
        },
    };
}

export const register: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    const request = JSON.parse(event.body as string ?? "{}");

    if (!request.username || !request.pw) {
        return {
            statusCode: 400,
            body: "No username/password supplemented",
        };
    }

    // must be a valid username
    if (!isValidUsername(request.username)) {
        return {
            statusCode: 400,
            body: "Invalid username"
        };
    }

    // TODO: check if username already exists in DB
    if (pepegadb.fetchUser(request.username) != undefined) {
        return {
            statusCode: 400,
            body: "User already exists",
        };
    }

    const id = randomUUID();
    const salt = randomBytes(16).toString("hex");
    const hash = await hashSalt(request.username, request.pw, salt);

    // register user in the db
    const item = {
        PK: "USER#" + id,
        SK: "USER#" + id,
        entity: "USER",
        username: request.username,
        display_name: request.username, // same as username by default
        pw: hash,
        salt,
    };
    await pepegadb
        .put({
            Item: item,
            TableName: "pepega-board",
        }).promise();

    return {
        statusCode: 200,
        body: JSON.stringify(item),
    };
}
