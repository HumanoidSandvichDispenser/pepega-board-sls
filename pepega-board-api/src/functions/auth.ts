import {
    APIGatewayProxyHandler,
    APIGatewayProxyEvent,
    APIGatewayProxyResult
} from "aws-lambda";
import AWS from "aws-sdk";
import { PutItemInputAttributeMap } from "aws-sdk/clients/dynamodb";
import { randomUUID, randomBytes, pbkdf2Sync } from "crypto";

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

function genHex(size: number) {
    let str = "";
    for (let i = 0; i < size; i++) {
        str += Math.floor(Math.random() * 16).toString(16);
    }
    return str;
}

async function hashSalt(name: string, pw: string, salt: string) {
    let fullSalt = name + salt + "gachiGASM";
    return pbkdf2Sync(pw, fullSalt, 77777, 64, "sha512").toString("hex");
};

async function fetchUser(username: string) {
    let results = await dynamodb.query({
            TableName: "pepega-board",
            IndexName: "username-index",
            KeyConditionExpression: "username = :username",
            ExpressionAttributeValues: {
                ":username": username,
            },
        }).promise();

    if (!results.Items || results.Items.length == 0) {
        return undefined;
    }

    return results.Items[0];
};

async function authenticate(username: string, pw: string) {
    if (!username || !pw) {
        return undefined;
    }

    let user = await fetchUser(username);

    if (!user) {
        return undefined;
    }

    const hash = await hashSalt(username, pw, user.salt);

    // do not authenticate if password is incorrect
    if (hash != user.pw ?? "") {
        return JSON.stringify({
            hash,
            PK: user.PK,
            username,
            pw,
            salt: user.salt,
        });
    }

    let token = randomBytes(32).toString("hex");

    // expires in 7776000 seconds (90 days)
    let expirary = Math.floor(new Date().getTime() / 1000) + 7776000;

    const item = {
        PK: user.PK,
        SK: "AUTH#" + token,
        entity: "AUTH",
        expirary,
    };

    // push token to DB
    // "await" to ensure that the item is put in the DB
    await dynamodb
        .put({
            TableName: "pepega-board",
            Item: item,
        }).promise();

    return token;
};

export const login: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    const request = JSON.parse(event.body as string ?? "{}");
    const auth = await authenticate(request.username, request.pw);
    if (!auth) {
        return {
            statusCode: 401,
            body: "Incorrect password",
        };
    }
    return {
        statusCode: 200,
        body: JSON.stringify({
            auth,
        }),
        headers: {
            "Set-Cookie": "pepegaboard_auth=" + auth,
        },
    };
}

export const register: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    const request = JSON.parse(event.body as string ?? "{}");

    // TODO: check if username already exists in DB

    const id = randomUUID();
    const salt = randomBytes(16).toString("hex");
    const hash = await hashSalt(request.username, request.pw, salt);

    // register user in the db
    const item = {
        PK: "USER#" + id,
        SK: "USER#" + id,
        entity: "USER",
        username: request.username,
        pw: hash,
        salt,
    };
    await dynamodb
        .put({
            Item: item,
            TableName: "pepega-board",
        }).promise();

    return {
        statusCode: 200,
        body: JSON.stringify(item),
    };
}
