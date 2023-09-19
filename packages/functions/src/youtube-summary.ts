import { ApiHandler } from 'sst/node/api';
import { z } from 'zod';
import { DynamoDB } from 'aws-sdk';
import ytdl from '@distube/ytdl-core';
import stream from 'stream';
import { Bucket } from 'sst/node/bucket';
import aws from 'aws-sdk';
import { Events } from '@sonic-summary/core/transcription';

const CreateYoutubeSummaryPayloadSchema = z.object({
  videoUrl: z.string(),
});
const dynamoDb = new DynamoDB.DocumentClient();

export const createYoutubeSummary = ApiHandler(async (_evt) => {
  try {
    const result = CreateYoutubeSummaryPayloadSchema.parse(
      JSON.parse(_evt.body as string),
    );

    const URL = result.videoUrl;
    const videoID = ytdl.getVideoID(URL);
    console.log('Video ID acquired', videoID);
    const passtrough = new stream.PassThrough();

    const video = ytdl(URL, {
      filter: 'audioonly',
      quality: 'lowestaudio',
    });
    console.log('Video audionly acquired');

    video.pipe(passtrough);

    const upload = new aws.S3.ManagedUpload({
      params: {
        Bucket: Bucket.YoutubeAudioBucket.bucketName,
        Key: `${videoID}.mp3`,
        Body: passtrough,
      },
      // 5 MB chunks
      partSize: 1024 * 1024 * 5,
    });

    await upload.promise();

    console.log('Upload complete');

    const url = await new aws.S3().getSignedUrlPromise('getObject', {
      Bucket: Bucket.YoutubeAudioBucket.bucketName,
      Key: `${videoID}.mp3`,
      Expires: 60 * 60,
    });

    await dynamoDb
      .put({
        TableName: process.env.SUMMARY_TABLE_NAME as string,
        Item: {
          id: videoID,
          createdAt: new Date().toUTCString(),
          originalText: '',
          status: 'transcribing',
        },
      })
      .promise();

    await Events.CreateYouTubeTranscription.publish({
      audio_url: url,
      id: videoID,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Success',
        data: {
          id: videoID,
        },
      }),
    };
  } catch (error) {
    console.log('an error occured');
    console.log(error);

    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Invalid payload',
          errors: error.errors,
        }),
      };
    }
  }
});

export const getSummary = ApiHandler(async (_evt) => {
  console.log('Getting summary');
  console.log(_evt.pathParameters?.id);
  const result = await dynamoDb
    .get({
      TableName: process.env.SUMMARY_TABLE_NAME as string,
      Key: {
        id: _evt.pathParameters?.id,
      },
      AttributesToGet: ['id', 'createdAt', 'originalText', 'status'],
    })
    .promise();

  if (!result.Item) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        message: 'Not found',
      }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'd',
      data: result.Item,
    }),
  };
});
