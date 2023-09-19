import { EventHandler } from 'sst/node/event-bus';
import { Summary } from '@sonic-summary/core/summary';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

export const handler = EventHandler(Summary.Events.Created, async (evt) => {
  const SUMMARY_TABLE_NAME = process.env.SUMMARY_TABLE_NAME as string;
  const SUMMARY_PARTS_TABLE_NAME = process.env
    .SUMMARY_PARTS_TABLE_NAME as string;
  console.log(
    `Part of summary created', ${evt.properties.partNumber}. Attempt number ${evt.attempts}.`,
  );

  const query = dynamoDb.scan({
    TableName: SUMMARY_TABLE_NAME,
    FilterExpression: 'id = :id',
    ExpressionAttributeValues: {
      ':id': evt.properties.id,
    },
  });

  const result = await query.promise();

  const totalParts = result.Items?.[0].totalParts;

  if (totalParts === undefined) {
    throw new Error(
      `The totalParts attribute is not defined for the summary with id ${evt.properties.id}`,
    );
  }

  // Now we need to check if all the parts of the summary are already in the database
  const queryParts = dynamoDb.scan({
    TableName: SUMMARY_PARTS_TABLE_NAME,
    FilterExpression: 'summaryId = :summaryId',
    ExpressionAttributeValues: {
      ':summaryId': evt.properties.id,
    },
  });

  const resultParts = await queryParts.promise();

  console.log(
    'At this point we have the following parts',
    resultParts.Items?.length,
  );
  console.log('The current total parts is', totalParts);

  if (resultParts.Items?.length === totalParts) {
    console.log(
      `All the parts of the summary with id ${evt.properties.id} are already in the database`,
    );
    // We need to update the status of the summary to summarized
    await dynamoDb
      .update({
        TableName: SUMMARY_TABLE_NAME,
        Key: {
          id: evt.properties.id,
        },
        UpdateExpression: 'set #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': 'summarized',
        },
      })
      .promise();

    return;
  }

  console.log(
    `Not all the parts of the summary with id ${evt.properties.id} are already in the database`,
  );
});
