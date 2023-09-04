import { StackContext, Api, EventBus, Table } from 'sst/constructs';

export function API({ stack }: StackContext) {
  const bus = new EventBus(stack, 'bus', {
    defaults: {
      retries: 10,
    },
  });

  const summaryTable = new Table(stack, 'summary', {
    fields: {
      id: 'string',
      createdAt: 'string',
      originalText: 'string',
      status: 'string',
    },
    primaryIndex: {
      partitionKey: 'id',
    },
  });

  const summaryPartsTable = new Table(stack, 'summaryParts', {
    fields: {
      id: 'string',
      summaryId: 'string',
      text: 'string',
      createdAt: 'string',
      completedAt: 'string',
      provider: 'string',
      summary: 'string',
      status: 'string',
      partNumber: 'number',
    },
    primaryIndex: {
      partitionKey: 'id',
      sortKey: 'summaryId',
    },
    globalIndexes: {
      summaryId: {
        partitionKey: 'summaryId',
        sortKey: 'createdAt',
      },
    },
  });

  const api = new Api(stack, 'api', {
    defaults: {
      function: {
        bind: [bus],
        environment: {
          REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN as string,
          SUMMARY_TABLE_NAME: summaryTable.tableName,
          SUMMARY_PARTS_TABLE_NAME: summaryPartsTable.tableName,
        },
      },
    },
    routes: {
      'GET /': 'packages/functions/src/lambda.handler',
      'GET /todo': 'packages/functions/src/todo.list',
      'POST /todo': 'packages/functions/src/todo.create',
      'POST /summary': 'packages/functions/src/summary.create',
    },
  });

  api.attachPermissions([summaryPartsTable, summaryTable]);

  bus.subscribe('todo.created', {
    handler: 'packages/functions/src/events/todo-created.handler',
  });

  bus.subscribe('summary.created', {
    handler: 'packages/functions/src/events/summary-created.handler',
  });

  bus.attachPermissions([summaryPartsTable, summaryTable]);

  bus.subscribe('summary.text-received', {
    handler: 'packages/functions/src/events/summary-text-received.handler',
    bind: [bus],
    environment: {
      REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN as string,
      SUMMARY_PARTS_TABLE_NAME: summaryPartsTable.tableName,
    },
    retryAttempts: 0,
    // 5 minutes
    timeout: 60 * 5,
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
