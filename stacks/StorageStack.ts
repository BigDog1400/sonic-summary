import { StackContext, Bucket } from 'sst/constructs';

export function StorageStack({ stack }: StackContext) {
  const youtubeAudioBucket = new Bucket(stack, 'YoutubeAudioBucket');

  return {
    youtubeAudioBucket,
  };
}
