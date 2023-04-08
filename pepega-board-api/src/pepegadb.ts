import AWS from "aws-sdk";

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

        return results.Items[0];
    }

    async fetchUserFromSession(id: string, auth: string) {
        let results = await this
            .query({
                TableName: "pepega-board",
                KeyConditionExpression: "PK = :id and SK = :auth",
                ExpressionAttributeValues: {
                    ":id": id,
                    ":auth": "AUTH#" + auth,
                },
            }).promise();

        if (!results.Items || results.Items.length == 0) {
            return undefined;
        }

        return results.Items[0];
    }
}
