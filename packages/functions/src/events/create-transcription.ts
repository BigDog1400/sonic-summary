import { EventHandler } from 'sst/node/event-bus';
import { Transcription } from '@sonic-summary/core/transcription';

export const handler = EventHandler(
  Transcription.Events.CreateYouTubeTranscription,
  async (evt) => {
    console.log(
      `Youtube audio url acquired for create transcription, ${evt.properties.audio_url}. Attempt number ${evt.attempts}.`,
    );

    await Transcription.create(evt.properties);
  },
);
