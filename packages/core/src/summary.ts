export * as Summary from './summary';
import { z } from 'zod';
import crypto from 'crypto';
import Replicate from 'replicate';
import { DynamoDB } from 'aws-sdk';

const dynamoDb = new DynamoDB.DocumentClient();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string,
});

const modelExpensive =
  'replicate/llama-2-70b-chat:2796ee9483c3fd7aa2e171d38f4ca12251a30609463dcfd4cd76703f22e96cdf';

const modelMedium =
  'a16z-infra/llama-2-13b-chat:9dff94b1bed5af738655d4a7cbcdcde2bd503aa85c94334fe1f42af7f3dd5ee3';

const model =
  'a16z-infra/llama-2-7b-chat:d24902e3fa9b698cc208b5e63136c4e26e828659a9f09827ca6ec5bb83014381';

import { event } from './event';

export const Events = {
  Created: event('summary.created', {
    id: z.string(),
    partNumber: z.number(),
  }),
  TextReceived: event('summary.text-received', {
    id: z.string(),
    text: z.string(),
    partNumber: z.number(),
  }),
};

interface CreateSummaryParams {
  text: string;
  id: string;
  partNumber: number;
}

// We need a function to validate if the text with the given id and partNumber is already in the database
export async function get(
  params: Pick<CreateSummaryParams, 'id' | 'partNumber'>,
) {
  const query = dynamoDb.scan({
    TableName: process.env.SUMMARY_PARTS_TABLE_NAME as string,
    FilterExpression: 'summaryId = :id AND partNumber = :partNumber',
    ExpressionAttributeValues: {
      ':id': params.id,
      ':partNumber': params.partNumber,
    },
  });

  const result = await query.promise();
  return result.Items?.[0];
}

export async function create(params: CreateSummaryParams) {
  const response = await replicate.run(model, {
    input: {
      prompt: params.text,
      system_prompt: `Summarize the main points from the given text in a concise paragraph format.
                  Refer to the person talking as 'speaker'. Write in third person.
                  Ensure you cover the key points and keep the response coherent.
                  Note that the text might be incomplete, so focus on capturing the essential information and crafting a coherent summary.
                  You are analyzing a section from a youtube video. Start saying "In this section`,
      max_new_tokens: 800,
    },
  });
  await dynamoDb
    .put({
      TableName: process.env.SUMMARY_PARTS_TABLE_NAME as string,
      Item: {
        id: crypto.randomUUID(),
        summaryId: params.id,
        text: params.text,
        createdAt: new Date().toUTCString(),
        completedAt: new Date().toUTCString(),
        provider: 'replicate',
        summary: (response as Array<string>).join(' ').trim(),
        status: 'completed',
        partNumber: params.partNumber,
      },
    })
    .promise();

  await Events.Created.publish({
    id: params.id,
    partNumber: params.partNumber,
  });
}
