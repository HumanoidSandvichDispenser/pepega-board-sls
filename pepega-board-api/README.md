# Pepega Board API

This is the serverless backend using Lambda, API Gateway, and DynamoDB.

The DynamoDB database is a single table with Global Secondary Indexes to
replicate joining tables like with traditional relational databases.

The authentication Lambda function relies on another Lambda function named
"hash_and_salt" which is not included in this project for security purposes.
