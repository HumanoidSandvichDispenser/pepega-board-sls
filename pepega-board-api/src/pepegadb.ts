import AWS from "aws-sdk";
import { getCookies, getUnixTime } from "./utils";
import { PutItemInput } from "aws-sdk/clients/dynamodb";
import { randomUUID } from "crypto";
import { env } from "process";
import { authenticateJWT } from "./jwt";

const HOST = process.env.LOCAL_DDB_HOST || "localhost";
const PORT = process.env.LOCAL_DDB_PORT || 8000;
const ENDPOINT = process.env.LOCAL_DDB_ENDPOINT || `http://${HOST}:${PORT}`;

/**
 * This is a wrapper around DynamoDB with helper functions to simplify the
 * Lambda functions.
 */
export default class PepegaDB extends AWS.DynamoDB.DocumentClient {
    constructor(options: AWS.DynamoDB.Types.ClientConfiguration = { }) {
        let isOffline = process.env.IS_OFFLINE || process.env.IS_LOCAL;

        let localOptions = isOffline ? {
            region: "localhost",
            endpoint: ENDPOINT,
            accessKeyId: "ID",
            serverAccessKey: "KEY",
        } : { };

        if (isOffline) {
            console.info("Running a local DynamoDB instance.");
        }

        super({
            ...options,
            ...localOptions,
        });
    }

    async fetchUser(username: string) {
        let results = await this
            .query({
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

        console.log(results.Items);

        return results.Items[0];
    }

    async fetchUserFromID(id: string) {
        if (!id.startsWith("USER_")) {
            return undefined;
        }

        let results = await this
            .get({
                TableName: "pepega-board",
                Key: {
                    PK: id,
                    SK: id,
                }
            })
            .promise();

        return results.Item;
    }

    async createPost(title: string, text: string, isPublic: boolean, user: any) {
        if (!user) {
            return undefined;
        }

        const postID = randomUUID();
        text = text.trim();
        let preview = text.length > 64 ? text.substring(0, 61) + "..." : text;

        const item = {
            PK: "POST_" + postID,
            SK: "POST_" + postID,
            title,
            text,
            preview: preview,
            is_public: isPublic,
            owner: user.PK,
            owner_username: user.username,
            owner_display_name: user.display_name,
            entity: "POST",
            time: getUnixTime(false),
        };

        await this
            .put({
                TableName: "pepega-board",
                Item: item,
            })
            .promise();
        return item;
    }
}
