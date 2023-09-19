import { SSTConfig } from 'sst';
import { API } from './stacks/MyStack';
import { Fronted } from './stacks/Fronted';
import { StorageStack } from './stacks/StorageStack';
export default {
  config(_input) {
    return {
      name: 'sonic-summary',
      region: 'us-east-1',
    };
  },
  stacks(app) {
    app.stack(StorageStack);
    app.stack(API);
    app.stack(Fronted);
  },
} satisfies SSTConfig;
