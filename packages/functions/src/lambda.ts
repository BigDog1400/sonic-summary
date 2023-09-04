import { ApiHandler } from "sst/node/api";

export async function handler(_evt: any) {
  return {
    statusCode: 200,
    body: `Hello world. The time is ${process.env.REPLICATE_API_TOKEN}`,
  };
}