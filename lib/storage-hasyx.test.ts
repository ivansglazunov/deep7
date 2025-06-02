import dotenv from 'dotenv';
import { Hasyx } from 'hasyx';
import { HasyxApolloClient, createApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import { newDeep } from '.';
import schema from '../public/hasura-schema.json';
import Debug from './debug';
import { defaultMarking } from './storage';

dotenv.config();

const debug = Debug('storage:hasyx:test');
const generate = Generator(schema as any);

const createRealHasyxClient = (): { hasyx: Hasyx; cleanup: () => void } => {
  const apolloClient = createApolloClient({
    url: process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!,
    secret: process.env.HASURA_ADMIN_SECRET!,
    ws: true,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);

  const cleanup = () => {
    if (hasyx && hasyx.apolloClient && typeof hasyx.apolloClient.terminate === 'function') {
      hasyx.apolloClient.terminate();
    }
    if (apolloClient.stop) {
      apolloClient.stop();
    }
    if (apolloClient.cache) {
      apolloClient.cache.reset();
    }
  };

  return { hasyx, cleanup };
};

const { hasyx, cleanup } = createRealHasyxClient();
describe('deep.StorageHasyx', () => {
  afterAll(() => {
    cleanup();
  });
  it('full cycle', async () => {
    const deep1 = newDeep();
    const storage1 = new deep1.StorageHasyx({}); // Create new storage
    defaultMarking(deep1, storage1);
    expect(storage1?.promise instanceof Promise).toBe(true);
    await storage1.promise;
    expect(await hasyx.select({
      table: 'deep_links',
      where: {
        _deep: { _eq: deep1._id },
      },
    })).toEqual([]);

    const deep2 = newDeep();
    const deep3 = newDeep();
  });
}); 