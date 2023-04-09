import AWS from "aws-sdk";
import { getCookies, getUnixTime } from "./utils";
import { PutItemInput } from "aws-sdk/clients/dynamodb";
import { randomUUID } from "crypto";
import { env } from "process";
import { authenticateJWT } from "./jwt";

/**
 * This is a wrapper around DynamoDB with helper functions to simplify the
 * Lambda functions.
 */
export default class PepegaDB extends AWS.DynamoDB.DocumentClient {
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

    async fetchUserFromSession(id: string, auth: string) {
        let results = await this
            .query({
                TableName: "pepega-board",
                KeyConditionExpression: "PK = :id and SK = :auth",
                ExpressionAttributeValues: {
                    ":id": id,
                    ":auth": auth,
                },
            }).promise();

        if (!results.Items || results.Items.length == 0) {
            return undefined;
        }

        return results.Items[0];
    }

    async fetchUserFromID(id: string) {
        let results = await this
            .query({
                TableName: "pepega-board",
                KeyConditionExpression: "PK = :id and SK = :id",
                ExpressionAttributeValues: {
                    ":id": id,
                },
            })
            .promise();

        if (!results.Items || results.Items.length == 0) {
            return undefined;
        }

        return results.Items[0];
    }

    async createPost(title: string, text: string, isPublic: boolean, user: any) {
        if (!user) {
            return undefined;
        }

        const postID = randomUUID();

        const item = {
            PK: "POST#" + postID,
            SK: "POST#" + postID,
            title,
            text,
            is_public: isPublic,
            owner: user.PK,
            owner_username: user.username,
            owner_display_name: user.display_name,
            entity: "POST",
            time: getUnixTime(),
        };

        return await this
            .put({
                TableName: "pepega-board",
                Item: item,
            })
            .promise();
    }
}
