import { ApiHandler } from 'sst/node/api';

export async function handler(_evt: any) {
  return {
    statusCode: 200,
    body: {
      message: 'Hello World',
    },
    headers: {
      'Content-Type': 'application/json',
    },
  };
}
