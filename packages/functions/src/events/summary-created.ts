import { EventHandler } from 'sst/node/event-bus';
import { Summary } from '@sonic-summary/core/summary';

export const handler = EventHandler(Summary.Events.Created, async (evt) => {
  console.log(
    `Part of summary created', ${evt.properties.partNumber}. Attempt number ${evt.attempts}.`,
  );
});
