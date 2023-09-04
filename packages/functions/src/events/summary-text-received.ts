import { EventHandler } from 'sst/node/event-bus';
import { Summary } from '@sonic-summary/core/summary';

export const handler = EventHandler(
  Summary.Events.TextReceived,
  async (evt) => {
    console.log(
      `Received part of summary number, ${evt.properties.partNumber}. Attempt number ${evt.attempts}.`,
    );

    console.log(
      `Validating if this part (${evt.properties.partNumber}) of this text (${evt.properties.id}) is already in the database.`,
    );

    const existingSummary = await Summary.get({
      id: evt.properties.id,
      partNumber: evt.properties.partNumber,
    });

    if (existingSummary) {
      console.log(
        `Part (${evt.properties.partNumber}) of this text (${evt.properties.id}) is already in the database.`,
      );
      return;
    } else {
      console.log(
        `Part (${evt.properties.partNumber}) of this text (${evt.properties.id}) is not in the database.`,
      );
      await Summary.create(evt.properties);
    }
  },
);
