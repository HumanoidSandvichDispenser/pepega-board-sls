import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

type APIEndpoint = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export default APIEndpoint;
