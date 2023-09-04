import { ApiHandler } from 'sst/node/api';
import { Summary } from '@sonic-summary/core/summary';
import { z } from 'zod';
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { Events } from '@sonic-summary/core/summary';

const CreateSummaryPayloadSchema = z.object({
  text: z.string(),
  url: z.string(),
});

const MAX_TOKENS_LENGTH_PER_PART = 4000;

const dynamoDb = new DynamoDB.DocumentClient();

export const create = ApiHandler(async (_evt) => {
  try {
    const result = CreateSummaryPayloadSchema.parse(
      JSON.parse(_evt.body as string),
    );

    const summaryParts = [] as string[];
    let remainingText = result.text;

    while (remainingText.length > 0) {
      const part = remainingText.substring(0, MAX_TOKENS_LENGTH_PER_PART - 1);
      remainingText = remainingText.substring(part.length);
      summaryParts.push(part);
    }

    await dynamoDb
      .put({
        TableName: process.env.SUMMARY_TABLE_NAME as string,
        Item: {
          id: result.url,
          createdAt: new Date().toUTCString(),
          originalText: result.text,
          status: 'pending',
        },
      })
      .promise();

    await Promise.all(
      summaryParts.map(async (part, index) => {
        await Events.TextReceived.publish({
          id: result.url,
          text: part,
          partNumber: index,
        });
      }),
    );

    return {
      statusCode: 200,
      body: 'Todo created',
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify(error.issues),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    } else
      return {
        statusCode: 500,
        body: JSON.stringify(error),
      };
  }
});
