/*
Copyright 2017 - 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at
    http://aws.amazon.com/apache2.0/
or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
*/



const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DeleteCommand, DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const bodyParser = require('body-parser');
const express = require('express');

const ddbClient = new DynamoDBClient({ region: process.env.TABLE_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

let tableName = "dynamo6f3fee2a";
if (process.env.ENV && process.env.ENV !== "NONE") {
  tableName = tableName + '-' + process.env.ENV;
}

const partitionKeyName = "ethereumAddress";
const partitionKeyType = "S";
const path = "/items";

// Declare a new Express app
const app = express();
app.use(bodyParser.json());
app.use(awsServerlessExpressMiddleware.eventContext());

// Enable CORS for all methods
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

/************************************
* HTTP Get method to list objects *
************************************/
app.get(path, async function(req, res) {
  const params = {
    TableName: tableName,
    Select: 'ALL_ATTRIBUTES',
  };

  try {
    const data = await ddbDocClient.send(new ScanCommand(params));
    res.json(data.Items);
  } catch (err) {
    res.statusCode = 500;
    res.json({ error: 'Could not load items: ' + err.message });
  }
});

/************************************
* HTTP Post method for insert object *
************************************/
app.post(path, async function(req, res) {
  const { ethereumAddress, username, imageUrl } = req.body;

  if (!ethereumAddress || !username || !imageUrl) {
    res.statusCode = 400;
    return res.json({ error: 'Missing required fields: ethereumAddress, username, imageUrl' });
  }

  const putItemParams = {
    TableName: tableName,
    Item: { ethereumAddress, username, imageUrl }
  };

  try {
    const data = await ddbDocClient.send(new PutCommand(putItemParams));
    res.json({ success: 'post call succeed!', url: req.url, data: data });
  } catch (err) {
    res.statusCode = 500;
    res.json({ error: err.message, url: req.url, body: req.body });
  }
});

/************************************
* HTTP Get method for querying objects *
************************************/
app.get(path + '/:ethereumAddress', async function(req, res) {
  const params = {
    TableName: tableName,
    Key: {
      ethereumAddress: req.params.ethereumAddress,
    }
  };

  try {
    const data = await ddbDocClient.send(new GetCommand(params));
    if (data.Item) {
      res.json(data.Item);
    } else {
      res.statusCode = 404;
      res.json({ error: 'Item not found' });
    }
  } catch (err) {
    res.statusCode = 500;
    res.json({ error: 'Could not retrieve item: ' + err.message });
  }
});

/**************************************
* HTTP Delete method to remove object *
**************************************/
app.delete(path + '/:ethereumAddress', async function(req, res) {
  const params = {
    TableName: tableName,
    Key: {
      ethereumAddress: req.params.ethereumAddress,
    }
  };

  try {
    const data = await ddbDocClient.send(new DeleteCommand(params));
    res.json({ success: 'delete call succeed!', url: req.url, data: data });
  } catch (err) {
    res.statusCode = 500;
    res.json({ error: 'Could not delete item: ' + err.message, url: req.url });
  }
});

app.listen(3000, function() {
  console.log("App started");
});

// Export the app object. When executing the application local this does nothing. However,
// to port it to AWS Lambda we will create a wrapper around that will load the app from
// this file
module.exports = app;
