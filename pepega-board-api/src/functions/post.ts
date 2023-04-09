import { authenticateCookies } from "../jwt";
import PepegaDB from "../pepegadb";
import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

const pepegadb = new PepegaDB();

export const createPost: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    let { title, text, isPublic } = JSON.parse(event.body ?? "{}");
    title ??= "Untitled";
    if (!title || !text) {
        return {
            statusCode: 400,
            body: "No title or text supplied",
        };
    }

    if (title.length > 128 || text.length > 4096) {
        return {
            statusCode: 401,
            body: "Title or body too long",
        };
    }

    let auth = authenticateCookies(event.headers);

    if (!auth) {
        return {
            statusCode: 401,
            body: "Unauthorized",
        }
    }

    const id = auth.aud;
    console.log(`User ${id} creating new post`);

    await pepegadb.createPost(
        title,
        text,
        isPublic,
        await pepegadb.fetchUserFromID(id));

    return {
        statusCode: 200,
        body: "",
    };
}

export const getPosts: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    let results = await pepegadb
        .query({
            TableName: "pepega-board",
            IndexName: "entity-time-index",
            KeyConditionExpression: "entity = :entity",
            ExpressionAttributeValues: {
                ":entity": "POST"
            }
        })
        .promise();

    if (!results.Items) {
        return {
            statusCode: 500,
            body: "Internal server error",
        };
    }

    let filteredResults = results.Items.map((v) => {
        if (!v.is_public) {
            v.owner = v.owner_username = v.owner_display_name = undefined;
        }
        return v;
    });

    return {
        statusCode: 200,
        body: JSON.stringify(filteredResults),
    };
}

export const getPostsFromUser: APIGatewayProxyHandler
        = async (event: APIGatewayProxyEvent):
        Promise<APIGatewayProxyResult> => {
    const { id } = JSON.parse(event.body ?? "{}");
    if (!id) {
        return {
            statusCode: 400,
            body: "Missing id",
        };
    }

    // check if the requesting user is the same
    const auth = authenticateCookies(event.headers);
    let isSameUser = auth?.aud == id;

    let results = await pepegadb
        .query({
            TableName: "pepega-board",
            IndexName: "owner-time-index",
            KeyConditionExpression: "#owner = :owner",
            FilterExpression: isSameUser ? undefined : "is_public = :true",
            ExpressionAttributeNames: {
                "#owner": "owner",
            },
            ExpressionAttributeValues: {
                ":owner": id,
                ":true": isSameUser ? undefined : true,
            },
        })
        .promise();

    return {
        statusCode: 200,
        body: JSON.stringify(results.Items),
    };
}
