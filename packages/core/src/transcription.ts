export * as Transcription from './transcription';
import { z } from 'zod';
import Replicate from 'replicate';
import { DynamoDB } from 'aws-sdk';
import { Events as SummaryEvents } from './summary';

const dynamoDb = new DynamoDB.DocumentClient();

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN as string,
});

const MAX_TOKENS_LENGTH_PER_PART = 4000;

const WHISPER_MODEL =
  'openai/whisper:91ee9c0c3df30478510ff8c8a3a545add1ad0259ad3a9f78fba57fbc05ee64f7';

import { event } from './event';

export const Events = {
  CreateYouTubeTranscription: event('transcription.youtube-transcription', {
    audio_url: z.string(),
    id: z.string(),
  }),
};

interface CreateYouTubeTranscription {
  audio_url: string;
  id: string;
}

// TODO: Get the transcription from the database (we need first to save it in the database)

export async function create(params: CreateYouTubeTranscription) {
  console.log('Creating transcription', params);
  const output = await replicate.run(WHISPER_MODEL, {
    input: {
      audio: params.audio_url,
    },
  });

  // @ts-ignore
  const transcription = output?.transcription as unknown as string;

  const summaryParts = [] as string[];

  let remainingText = transcription;

  await dynamoDb
    .put({
      TableName: process.env.SUMMARY_TABLE_NAME as string,
      Item: {
        id: params.id,
        createdAt: new Date().toUTCString(),
        originalText: transcription,
        status: 'summarizing',
      },
    })
    .promise();

  while (remainingText.length > 0) {
    const part = remainingText.substring(0, MAX_TOKENS_LENGTH_PER_PART - 1);
    remainingText = remainingText.substring(part.length);
    summaryParts.push(part);
  }

  // Set the parts number in the database
  await dynamoDb
    .update({
      TableName: process.env.SUMMARY_TABLE_NAME as string,
      Key: {
        id: params.id,
      },
      UpdateExpression: 'set #totalParts = :totalParts',
      ExpressionAttributeNames: {
        '#totalParts': 'totalParts',
      },
      ExpressionAttributeValues: {
        ':totalParts': summaryParts.length,
      },
    })
    .promise();

  await Promise.all(
    summaryParts.map(async (part, index) => {
      await SummaryEvents.TextReceived.publish({
        id: params.id,
        text: part,
        partNumber: index + 1,
      });
    }),
  );

  //   TODO: Save the transcription in the database
  //   await dynamoDb
  //     .put({
  //       TableName: '...',
  //       Item: {

  //       },
  //     })
  //     .promise();
}
