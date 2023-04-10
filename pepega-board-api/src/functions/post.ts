import { authenticateCookies, authenticateJWT } from "../jwt";
import PepegaDB from "../pepegadb";
import APIEndpoint from "../apiendpoint";
import { randomUUID } from "crypto";
import { getUnixTime } from "src/utils";

const pepegadb = new PepegaDB();

function putRequest(pk: string, sk: string, item: any = undefined) {
    return {
        PutRequest: {
            Item: {
                PK: pk,
                SK: sk,
                ...item
            },
        },
    };
}

export const createPost: APIEndpoint = async (event) => {
    let { title, text, isPublic } = JSON.parse(event.body ?? "{}");
    title ??= "Untitled";
    if (!title || !text) {
        return {
            statusCode: 400,
            body: "No title or text supplied",
        };
    }

    if (title.length > 128 || text.length > 1024) {
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

    let post = await pepegadb.createPost(
        title,
        text,
        isPublic,
        await pepegadb.fetchUserFromID(id));

    return {
        statusCode: 200,
        body: JSON.stringify(post?.Attributes),
    };
}

/**
 * Gets the 15 latest posts
 */
export const getPosts: APIEndpoint = async (event) => {
    let id = authenticateCookies(event.headers)?.aud;

    let results = await pepegadb
        .query({
            TableName: "pepega-board",
            IndexName: "entity-time-index",
            KeyConditionExpression: "entity = :entity",
            ExpressionAttributeValues: {
                ":entity": "POST",
            },
            ScanIndexForward: false,
            Limit: 15,
            ProjectionExpression: [
                "PK",
                "SK",
                "title",
                "preview",
                "#owner",
                "owner_username",
                "owner_display_name",
            ].join(", "),
            ExpressionAttributeNames: {
                "#owner": "owner",
            }
        })
        .promise();

    console.log(results);

    if (!results.Items) {
        return {
            statusCode: 500,
            body: "Internal server error",
        };
    }

    let filteredResults = results.Items.map((v) => {
        // remove identifying info if we're not the owner or posted anonymously
        if (!v.is_public && v.owner != id) {
            v.owner = v.owner_username = v.owner_display_name = undefined;
        }
        return v;
    });

    return {
        statusCode: 200,
        body: JSON.stringify(filteredResults),
    };
}

export const getPostsFromUser: APIEndpoint = async (event) => {
    const { id } = JSON.parse(event.body ?? "{}");
    console.log(id);
    if (!id) {
        return {
            statusCode: 400,
            body: "Missing id",
        };
    }

    // check if the requesting user is the same
    const auth = authenticateCookies(event.headers);
    let isSameUser = auth?.aud == id;

    let filter = "entity = :post";
    if (!isSameUser) {
        filter += " and is_public = :true";
    }

    let results = await pepegadb
        .query({
            TableName: "pepega-board",
            IndexName: "owner-time-index",
            KeyConditionExpression: "#owner = :owner",
            FilterExpression: filter,
            ExpressionAttributeNames: {
                "#owner": "owner",
            },
            ExpressionAttributeValues: {
                ":owner": id,
                ":post": "POST",
                ":true": isSameUser ? undefined : true,
            },
        })
        .promise();

    return {
        statusCode: 200,
        body: JSON.stringify(results.Items),
    };
}

/**
 * Replies to a post or a thread. If replying to a post, it creates a thread.
 */
export const reply: APIEndpoint = async (event) => {
    const { id, text } = JSON.parse(event.body ?? "{}");

    if (!id || !text) {
        return {
            statusCode: 400,
            body: ""
        };
    }

    if (text.length > 512) {
        return {
            statusCode: 401,
            body: "REPLY_TOO_LONG",
        };
    }

    const auth = authenticateCookies(event.headers);

    if (!auth) {
        return {
            statusCode: 403,
            body: ""
        };
    }

    // check if the id is a post or a thread
    let result = await pepegadb
        .get({
            TableName: "pepega-board",
            Key: {
                PK: id,
                SK: id,
            }
        }).promise();

    let post = result.Item;

    if (!post) {
        return {
            statusCode: 404,
            body: "POST_OR_THREAD_NOT_FOUND",
        };
    }

    let sender = await pepegadb.fetchUserFromID(auth.aud);

    if (!sender) {
        // wtf happened?
        return {
            statusCode: 400,
            body: "",
        }
    }

    let existingThread: any = undefined;

    if (post.entity == "POST") {
        // check if thread is owned by person making the thread
        if (post.owner == sender.PK) {
            return {
                statusCode: 400,
                body: "",
            };
        }

        // check if thread exists by checking if post has sender's ID
        existingThread = (await pepegadb
            .get({
                TableName: "pepega-board",
                Key: {
                    PK: post.PK,
                    SK: sender.PK,
                }
            })
            .promise()).Item;
    }

    let threadID: string;
    const time = getUnixTime(false);

    if (existingThread == undefined && post.entity == "POST") {
        // if we are a post create a new thread
        threadID = "THREAD_" + randomUUID();

        await pepegadb.batchWrite({
            RequestItems: {
                "pepega-board": [
                    putRequest(threadID, threadID, {
                        time: time,
                        entity: "THREAD",
                    }),
                    // original poster
                    putRequest(threadID, post.owner, {
                        is_public: post.is_public,
                        owner: post.owner,
                        owner_username: post.owner_username,
                        owner_display_name: post.owner_display_name,
                        entity: "PARTICIPANT",
                    }),
                    // sender
                    putRequest(threadID, sender.PK, {
                        is_public: false,
                        owner: sender.PK,
                        owner_username: sender.username,
                        owner_display_name: post.owner_display_name,
                        entity: "PARTICIPANT",
                    }),
                    putRequest(threadID, "TIME_" + post.time, {
                        title: post.title,
                        text: post.text,
                        owner: post.owner,
                        time: post.time,
                        entity: "POST",
                    }),
                    putRequest(threadID, "TIME_" + time, {
                        text,
                        owner: sender.PK,
                        time,
                        entity: "REPLY",
                    }),
                    // put sender's ID in post to show thread was created
                    putRequest(post.PK, sender.PK, {
                        thread: threadID,
                        entity: "THREAD_SIGN"
                    }),
                ],
            },
        }).promise();
    } else if (existingThread || post.entity == "THREAD") {
        if (existingThread) {
            console.log("existing thread!");
            threadID = existingThread.thread;
            console.log("thread = " + threadID);
        } else {
            threadID = id;
        }
        await pepegadb.put({
            TableName: "pepega-board",
            Item: {
                PK: threadID,
                SK: "TIME_" + time,
                text,
                owner: sender.PK,
                time,
            }}).promise();
    } else {
        return {
            statusCode: 400,
            body: "Not replying to a post nor a thread",
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            thread: threadID,
        }),
    };
}

export const getThread: APIEndpoint = async (event) => {
    //const { id, lastEvaluatedKey } = JSON.parse(event.body ?? "{}");
    const { id } = event.pathParameters ?? { };
    const { start } = event.queryStringParameters ?? { };
    let startKey = start ? { S: start } : undefined;
    console.log(start);

    const auth = authenticateCookies(event.headers);

    if (!auth) {
        return {
            statusCode: 403,
            body: ""
        };
    }

    let info = (await pepegadb
        .get({
            TableName: "pepega-board",
            Key: {
                PK: id,
                SK: auth.aud,
            }
        }).promise()).Item;

    // we are not authorized since we can't find ourselves in thread
    if (!info) {
        return {
            statusCode: 403,
            body: ""
        };
    }

    let result = await pepegadb
        .query({
            TableName: "pepega-board",
            KeyConditionExpression: "PK = :id",
            Limit: 8,
            ExclusiveStartKey: startKey,
            ScanIndexForward: false,
            ExpressionAttributeValues: {
                ":id": id,
            },
        }).promise();

    let users = result.Items?.filter((item) => {
        return item.entity == "PARTICIPANT" &&
            (item.owner == auth.aud || item.is_public);
    });

    let replies = result.Items?.filter((item) => item.SK.startsWith("TIME_"))
        .map((reply) => {
            console.log("aud = " + auth.aud);
            console.log("own = " + reply.owner);
            if (reply.owner != auth.aud) {
                // if we are not the recipient
                // remove the display name
                reply.owner = undefined;
            }
            return reply;
        });

    return {
        statusCode: 200,
        body: JSON.stringify({
            lastEvaluatedKey: result.LastEvaluatedKey,
            users,
            replies,
        }),
    };
}
