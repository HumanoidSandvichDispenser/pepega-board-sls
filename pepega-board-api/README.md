# Pepega Board API

This is the serverless backend using Lambda, API Gateway, and DynamoDB.

The DynamoDB database is a single table with Global Secondary Indexes to
replicate joining tables like with traditional relational databases.

The API Gateway creates a RESTful API which calls Lambda functions to
perform actions such as querying the database and additing items.
