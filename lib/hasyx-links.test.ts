import { Hasyx, createApolloClient, HasyxApolloClient, Generator } from 'hasyx';
import { v4 as uuidv4 } from 'uuid';
import { newDeep } from '.';
import Debug from './debug';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';

dotenv.config();

// Initialize debug for this test suite
const debug = Debug('test:hasyx-links');
const generate = Generator(schema as any);

const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!;
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET!;

// Test deep space ID for all test associations
const TEST_DEEP_SPACE_ID = uuidv4();

// Helper function to create isolated Hasura client for each test
function createTestHasyxClient(): { hasyx: Hasyx, cleanup: () => Promise<void> } {
  const apolloClient = createApolloClient({
    url: HASURA_URL,
    secret: ADMIN_SECRET,
    ws: false,
  }) as HasyxApolloClient;

  const hasyx = new Hasyx(apolloClient, generate);

  const cleanup = async () => {
    // Close Apollo Client connections
    if (apolloClient.stop) {
      apolloClient.stop();
    }
    if (apolloClient.cache) {
      apolloClient.cache.reset();
    }
    // Clear any remaining subscriptions
    if (apolloClient.clearStore) {
      await apolloClient.clearStore();
    }
  };

  return { hasyx, cleanup };
}

interface TestLink {
  id: string;
  type_id?: string;
  from_id?: string;
  to_id?: string;
  value_id?: string;
  string?: string;
  number?: number;
  function?: string;
  object?: any;
}

describe.skip('Hasyx Links Integration Tests', () => {

  describe('Basic CRUD Operations', () => {
    it('should perform CRUD operations on links VIEW table', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      // Declare variables outside try block for cleanup access
      const testLinkId = uuidv4();
      let newTypeId: string;
      let typeTargetLink: any;

      try {
        debug('Testing basic CRUD operations on links VIEW...');

        // CREATE - Insert into links VIEW (with id == _deep to allow NULL type_id)
        debug(`Creating new test link with ID: ${testLinkId}`);

        const initialLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: testLinkId,
            _deep: testLinkId  // id == _deep allows NULL type_id
          },
          returning: 'id'
        });
        debug('Result of insert operation:', initialLink);
        expect(initialLink.id).toBe(testLinkId);

        // Test SELECT for the created link
        debug(`Selecting link with ID: ${testLinkId}`);

        const selectedLinks = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          returning: ['id', 'type_id', 'from_id', 'to_id', 'value_id', 'string', 'number', 'function']
        });

        debug('Result of select operation:', selectedLinks);

        expect(selectedLinks).toBeDefined();
        expect(Array.isArray(selectedLinks)).toBe(true);
        expect(selectedLinks.length).toBeGreaterThan(0);
        expect(selectedLinks[0].id).toBe(testLinkId);

        // Test UPDATE with type_id reference
        newTypeId = uuidv4();
        debug(`Creating a link to use as type_id with ID: ${newTypeId}`);

        // Create a valid link for type_id (with id == _deep to allow NULL type_id)
        typeTargetLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: newTypeId,
            _deep: newTypeId  // id == _deep allows NULL type_id
          },
          returning: 'id'
        });
        debug('Result of insert for type target:', typeTargetLink);

        debug(`Updating link ${testLinkId} to set type_id to ${newTypeId}`);
        const updateResponse = await adminHasyx.update({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          _set: { type_id: typeTargetLink.id },
          returning: ['id', 'type_id']
        });

        debug('Result of update operation:', updateResponse);

        expect(updateResponse).toBeDefined();
        expect(updateResponse.returning).toBeDefined();
        expect(updateResponse.returning.length).toBeGreaterThan(0);
        const updatedLink = updateResponse.returning[0];
        expect(updatedLink.id).toBe(testLinkId);
        expect(updatedLink.type_id).toBe(typeTargetLink.id);

        // Verify update with select
        debug(`Verifying update by selecting link ${testLinkId} again`);
        const verifyLinks = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          returning: ['id', 'type_id']
        });

        debug('Result of select for verification:', verifyLinks);

        expect(verifyLinks).toBeDefined();
        expect(Array.isArray(verifyLinks)).toBe(true);
        expect(verifyLinks.length).toBeGreaterThan(0);
        expect(verifyLinks[0].type_id).toBe(typeTargetLink.id);

        // Test DELETE
        debug(`Deleting test link with ID: ${testLinkId}`);
        const deleteResult = await adminHasyx.delete({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          returning: ['id']
        });

        debug('Result of delete operation:', deleteResult);

        expect(deleteResult).toBeDefined();
        expect(deleteResult.affected_rows).toBe(1);
        expect(Array.isArray(deleteResult.returning)).toBe(true);
        expect(deleteResult.returning.length).toBe(1);
        expect(deleteResult.returning[0].id).toBe(testLinkId);

        // Verify deletion
        debug(`Verifying deletion by selecting link ${testLinkId} again`);
        const deletedLinkArray = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          returning: ['id']
        });

        debug('Result of select after deletion:', deletedLinkArray);

        expect(deletedLinkArray).toEqual([]);

        // Cleanup the typeTargetLink
        debug(`Cleaning up type target link with ID: ${typeTargetLink.id}`);
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: typeTargetLink.id } } });
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: testLinkId } } }).catch(() => { });
          if (typeTargetLink) {
            await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: typeTargetLink.id } } }).catch(() => { });
          }
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    }, 15000);
  });

  describe('Data Fields Tests', () => {
    it('should handle string data field through VIEW', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();

      try {
        debug('Testing string data field through links VIEW...');

        const testString = 'test string value';

        // Create link with string data
        const linkWithString = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: linkId,  // id == _deep allows NULL type_id
            string: testString
          },
          returning: ['id', 'string']
        });

        debug('Result of insert with string:', linkWithString);

        expect(linkWithString.id).toBe(linkId);
        expect(linkWithString.string).toBe(testString);

        // Verify string data persists
        const selectedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'string']
        });

        expect(selectedLink.length).toBe(1);
        expect(selectedLink[0].string).toBe(testString);

        // Update string data
        const newString = 'updated string value';
        await adminHasyx.update({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          _set: { string: newString },
          returning: ['id', 'string']
        });

        // Verify update
        const updatedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'string']
        });

        expect(updatedLink[0].string).toBe(newString);

        debug('✅ String data field test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle number data field through VIEW', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();

      try {
        debug('Testing number data field through links VIEW...');

        const testNumber = 42.123;

        // Create link with number data
        const linkWithNumber = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: linkId,  // id == _deep allows NULL type_id
            number: testNumber
          },
          returning: ['id', 'number']
        });

        debug('Result of insert with number:', linkWithNumber);

        expect(linkWithNumber.id).toBe(linkId);
        expect(linkWithNumber.number).toBe(testNumber);

        // Verify number data persists
        const selectedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'number']
        });

        expect(selectedLink.length).toBe(1);
        expect(selectedLink[0].number).toBe(testNumber);

        // Update number data
        const newNumber = 99.999;
        await adminHasyx.update({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          _set: { number: newNumber },
          returning: ['id', 'number']
        });

        // Verify update
        const updatedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'number']
        });

        expect(updatedLink[0].number).toBe(newNumber);

        debug('✅ Number data field test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle function data field through VIEW', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();

      try {
        debug('Testing function data field through links VIEW...');

        const testFunction = 'function test() { return "hello"; }';

        // Create link with function data
        const linkWithFunction = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: linkId,  // id == _deep allows NULL type_id
            function: testFunction
          },
          returning: ['id', 'function']
        });

        debug('Result of insert with function:', linkWithFunction);

        expect(linkWithFunction.id).toBe(linkId);
        expect(linkWithFunction.function).toBe(testFunction);

        // Verify function data persists
        const selectedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'function']
        });

        expect(selectedLink.length).toBe(1);
        expect(selectedLink[0].function).toBe(testFunction);

        // Update function data
        const newFunction = 'function updated() { return "world"; }';
        await adminHasyx.update({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          _set: { function: newFunction },
          returning: ['id', 'function']
        });

        // Verify update
        const updatedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'function']
        });

        expect(updatedLink[0].function).toBe(newFunction);

        debug('✅ Function data field test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle object data field through VIEW', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();

      try {
        debug('Testing object data field through links VIEW...');

        const testObject = { a: 1, b: { c: 'test' } };

        // Create link with object data
        const linkWithObject = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: linkId,  // id == _deep allows NULL type_id
            object: testObject
          },
          returning: ['id', 'object']
        });

        debug('Result of insert with object:', linkWithObject);

        expect(linkWithObject.id).toBe(linkId);
        expect(linkWithObject.object).toEqual(testObject);

        // Verify object data persists
        const selectedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'object']
        });

        expect(selectedLink.length).toBe(1);
        expect(selectedLink[0].object).toEqual(testObject);

        // Update object data
        const newObject = { x: 'updated', y: [1, 2, 3] };
        await adminHasyx.update({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          _set: { object: newObject },
          returning: ['id', 'object']
        });

        // Verify update
        const updatedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'object']
        });

        expect(updatedLink[0].object).toEqual(newObject);

        debug('✅ Object data field test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle multiple data fields in single link', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();

      try {
        debug('Testing multiple data fields in single link...');

        const testString = 'multi data test';
        const testNumber = 123.456;
        const testFunction = 'function multi() { return 42; }';
        const testObject = { a: 'z', b: [5, 6] };

        // Create link with all data types
        const linkWithAllData = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: linkId,  // id == _deep allows NULL type_id
            string: testString,
            number: testNumber,
            function: testFunction,
            object: testObject
          },
          returning: ['id', 'string', 'number', 'function', 'object']
        });

        debug('Result of insert with all data:', linkWithAllData);

        expect(linkWithAllData.id).toBe(linkId);
        expect(linkWithAllData.string).toBe(testString);
        expect(linkWithAllData.number).toBe(testNumber);
        expect(linkWithAllData.function).toBe(testFunction);
        expect(linkWithAllData.object).toEqual(testObject);

        // Verify all data persists
        const selectedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'string', 'number', 'function', 'object']
        });

        expect(selectedLink.length).toBe(1);
        expect(selectedLink[0].string).toBe(testString);
        expect(selectedLink[0].number).toBe(testNumber);
        expect(selectedLink[0].function).toBe(testFunction);
        expect(selectedLink[0].object).toEqual(testObject);

        debug('✅ Multiple data fields test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });
  });

  describe('Relationships Tests', () => {
    it('should handle link relationships through VIEW', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const typeId = uuidv4();
      const fromId = uuidv4();
      const toId = uuidv4();
      const valueId = uuidv4();
      const linkId = uuidv4();

      try {
        debug('Testing link relationships through VIEW...');

        // Create type link
        const typeLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: typeId,
            _deep: typeId,  // id == _deep allows NULL type_id
            string: 'Type'
          },
          returning: ['id']
        });

        // Create from link
        const fromLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: fromId,
            _deep: fromId,  // id == _deep allows NULL type_id
            string: 'From'
          },
          returning: ['id']
        });

        // Create to link
        const toLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: toId,
            _deep: toId,  // id == _deep allows NULL type_id
            string: 'To'
          },
          returning: ['id']
        });

        // Create value link
        const valueLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: valueId,
            _deep: valueId,  // id == _deep allows NULL type_id
            string: 'Value'
          },
          returning: ['id']
        });

        // Create main link with all relationships
        const mainLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: TEST_DEEP_SPACE_ID,  // Different _deep, so type_id is required
            type_id: typeId,
            from_id: fromId,
            to_id: toId,
            value_id: valueId
          },
          returning: ['id', 'type_id', 'from_id', 'to_id', 'value_id']
        });

        debug('Result of insert with relationships:', mainLink);

        expect(mainLink.id).toBe(linkId);
        expect(mainLink.type_id).toBe(typeId);
        expect(mainLink.from_id).toBe(fromId);
        expect(mainLink.to_id).toBe(toId);
        expect(mainLink.value_id).toBe(valueId);

        // Test relationships using GraphQL
        const linkWithRelations = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: [
            'id',
            'type_id',
            'from_id',
            'to_id',
            'value_id',
            { type: ['id', 'string'] },
            { from: ['id', 'string'] },
            { to: ['id', 'string'] },
            { value: ['id', 'string'] }
          ]
        });

        debug('Result with relationships:', JSON.stringify(linkWithRelations, null, 2));

        expect(linkWithRelations.length).toBe(1);
        const link = linkWithRelations[0];

        // Log the actual structure to understand what's returned
        debug('Link structure:', JSON.stringify(link, null, 2));
        debug('Type field:', link.type);
        debug('From field:', link.from);
        debug('To field:', link.to);
        debug('Value field:', link.value);

        // Check if relationships exist before accessing properties
        if (!link.type) {
          debug('ERROR: type relationship is missing!');
          throw new Error('Type relationship not found - relationships may not be properly configured');
        }

        expect(link.type.id).toBe(typeId);
        expect(link.type.string).toBe('Type');
        expect(link.from.id).toBe(fromId);
        expect(link.from.string).toBe('From');
        expect(link.to.id).toBe(toId);
        expect(link.to.string).toBe('To');
        expect(link.value.id).toBe(valueId);
        expect(link.value.string).toBe('Value');

        debug('✅ Link relationships test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: typeId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: fromId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: toId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: valueId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle array relationships (typed, out, in, valued)', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const typeId = uuidv4();
      const link1Id = uuidv4();
      const link2Id = uuidv4();

      try {
        debug('Testing array relationships...');

        // Create type link - use id == _deep to allow NULL type_id
        const typeLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: typeId,
            _deep: typeId,  // id == _deep allows NULL type_id
            string: 'TestType'
          },
          returning: ['id']
        });

        // Create two links of the same type
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: TEST_DEEP_SPACE_ID,
            type_id: typeId,
            string: 'Instance1'
          },
          returning: ['id', 'type_id']
        });

        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: TEST_DEEP_SPACE_ID,
            type_id: typeId,
            string: 'Instance2'
          },
          returning: ['id', 'type_id']
        });

        // Test typed relationship (array)
        const typeWithInstances = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: typeId } },
          returning: [
            'id',
            'string',
            { typed: ['id', 'string'] }
          ]
        });

        debug('Type with typed instances:', typeWithInstances);

        expect(typeWithInstances.length).toBe(1);
        expect(typeWithInstances[0].typed.length).toBe(2);

        const typedIds = typeWithInstances[0].typed.map((t: any) => t.id);
        expect(typedIds).toContain(link1Id);
        expect(typedIds).toContain(link2Id);

        debug('✅ Array relationships test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: typeId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });
  });

  describe('Data Integrity Tests', () => {
    // temporary disabled in up-links
    it.skip('should enforce referential integrity for link references', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const nonExistentId = uuidv4();

      try {
        debug('Testing referential integrity...');

        // Try to create link with non-existent type_id
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            type_id: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();

        // Try to create link with non-existent from_id
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            from_id: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();

        // Try to create link with non-existent to_id
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            to_id: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();

        // Try to create link with non-existent value_id
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            value_id: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();

        debug('✅ Referential integrity test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        await cleanup();
      }
    });

    it('should enforce type_id rule: type_id can only be NULL if id == _deep', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId1 = uuidv4();
      const linkId2 = uuidv4();
      const deepId = uuidv4();

      try {
        debug('Testing type_id validation rule...');

        // This should work: id == _deep allows NULL type_id
        const validLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId1,
            _deep: linkId1,  // id == _deep, so type_id can be NULL
            string: 'Valid link with NULL type_id'
          },
          returning: ['id', 'type_id', '_deep']
        });

        expect(validLink.id).toBe(linkId1);
        expect(validLink.type_id).toBeNull();
        expect(validLink._deep).toBe(linkId1);

        // This should fail: id != _deep but type_id is NULL (implicit)
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId2,
            _deep: deepId,  // id != _deep, so type_id cannot be NULL
            string: 'Invalid link with NULL type_id'
          },
          returning: 'id'
        })).rejects.toThrow();

        debug('✅ type_id validation rule test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId1 } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });
  });

  describe('Deduplication Tests', () => {
    it('should deduplicate string values automatically', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const link1Id = uuidv4();
      const link2Id = uuidv4();
      const link3Id = uuidv4();

      try {
        debug('Testing string deduplication...');

        const sharedString = 'shared string value for deduplication test';

        // Create first link with string (id == _deep to allow NULL type_id)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL type_id
            string: sharedString
          },
          returning: ['id', 'string']
        });

        // Create second link with same string (id == _deep to allow NULL type_id)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL type_id
            string: sharedString
          },
          returning: ['id', 'string']
        });

        expect(link1.string).toBe(sharedString);
        expect(link2.string).toBe(sharedString);

        // Check that both links reference the same _string UUID in physical _links table
        const physicalLinks = await adminHasyx.select({
          table: 'deep__links',
          where: {
            id: { _in: [link1Id, link2Id] }
          },
          returning: ['id', '_string'],
          order_by: [{ id: 'asc' }]
        });

        debug('Physical links query result:', physicalLinks);

        expect(physicalLinks.length).toBe(2);
        expect(physicalLinks[0]._string).toBe(physicalLinks[1]._string);
        expect(physicalLinks[0]._string).toBeTruthy();

        const stringReferenceId = physicalLinks[0]._string;
        debug(`Both links reference the same string UUID: ${stringReferenceId}`);

        // Verify there's only one entry in _strings table for this value
        const stringsData = await adminHasyx.select({
          table: 'deep__strings',
          where: { data: { _eq: sharedString } },
          returning: ['id', 'data']
        });
        expect(stringsData.length).toBe(1);

        // Delete both links
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } });
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } });

        // Verify links are deleted but string value remains in _strings table
        const remainingLinks = await adminHasyx.select({
          table: 'deep_links',
          where: {
            _or: [
              { id: { _eq: link1Id } },
              { id: { _eq: link2Id } }
            ]
          },
          returning: ['id']
        });
        expect(remainingLinks.length).toBe(0);

        const remainingStrings = await adminHasyx.select({
          table: 'deep__strings',
          where: { data: { _eq: sharedString } },
          returning: ['id', 'data']
        });
        expect(remainingStrings.length).toBe(1);
        expect(remainingStrings[0].id).toBe(stringReferenceId);
        debug(`String value preserved after link deletion: ${remainingStrings[0].id}`);

        // Create new link with same string value
        const link3 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link3Id,
            _deep: link3Id,  // id == _deep allows NULL type_id
            string: sharedString
          },
          returning: ['id', 'string']
        });

        expect(link3.string).toBe(sharedString);

        // Verify new link uses the existing deduplicated string
        const newLinkPhysical = await adminHasyx.select({
          table: 'deep__links',
          where: { id: { _eq: link3Id } },
          returning: ['id', '_string']
        });

        expect(newLinkPhysical.length).toBe(1);
        expect(newLinkPhysical[0]._string).toBe(stringReferenceId);
        debug(`New link reuses existing string UUID: ${newLinkPhysical[0]._string}`);

        // Verify still only one entry in _strings table
        const finalStringsData = await adminHasyx.select({
          table: 'deep__strings',
          where: { data: { _eq: sharedString } },
          returning: ['id', 'data']
        });
        expect(finalStringsData.length).toBe(1);

        debug('✅ String deduplication test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link3Id } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should deduplicate number values automatically', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const link1Id = uuidv4();
      const link2Id = uuidv4();
      const link3Id = uuidv4();

      try {
        debug('Testing number deduplication...');

        const sharedNumber = 42.123456;

        // Create first link with number (id == _deep to allow NULL type_id)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL type_id
            number: sharedNumber
          },
          returning: ['id', 'number']
        });

        // Create second link with same number (id == _deep to allow NULL type_id)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL type_id
            number: sharedNumber
          },
          returning: ['id', 'number']
        });

        expect(link1.number).toBe(sharedNumber);
        expect(link2.number).toBe(sharedNumber);

        // Check that both links reference the same _number UUID in physical _links table
        const physicalLinks = await adminHasyx.select({
          table: 'deep__links',
          where: {
            id: { _in: [link1Id, link2Id] }
          },
          returning: ['id', '_number'],
          order_by: [{ id: 'asc' }]
        });

        debug('Physical links query result:', physicalLinks);

        expect(physicalLinks.length).toBe(2);
        expect(physicalLinks[0]._number).toBe(physicalLinks[1]._number);
        expect(physicalLinks[0]._number).toBeTruthy();

        const numberReferenceId = physicalLinks[0]._number;
        debug(`Both links reference the same number UUID: ${numberReferenceId}`);

        // Verify there's only one entry in _numbers table for this value
        const numbersData = await adminHasyx.select({
          table: 'deep__numbers',
          where: { data: { _eq: sharedNumber } },
          returning: ['id', 'data']
        });
        expect(numbersData.length).toBe(1);

        // Delete both links
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } });
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } });

        // Verify links are deleted but number value remains in _numbers table
        const remainingLinks = await adminHasyx.select({
          table: 'deep_links',
          where: {
            _or: [
              { id: { _eq: link1Id } },
              { id: { _eq: link2Id } }
            ]
          },
          returning: ['id']
        });
        expect(remainingLinks.length).toBe(0);

        const remainingNumbers = await adminHasyx.select({
          table: 'deep__numbers',
          where: { data: { _eq: sharedNumber } },
          returning: ['id', 'data']
        });
        expect(remainingNumbers.length).toBe(1);
        expect(remainingNumbers[0].id).toBe(numberReferenceId);
        debug(`Number value preserved after link deletion: ${remainingNumbers[0].id}`);

        // Create new link with same number value
        const link3 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link3Id,
            _deep: link3Id,  // id == _deep allows NULL type_id
            number: sharedNumber
          },
          returning: ['id', 'number']
        });

        expect(link3.number).toBe(sharedNumber);

        // Verify new link uses the existing deduplicated number
        const newLinkPhysical = await adminHasyx.select({
          table: 'deep__links',
          where: { id: { _eq: link3Id } },
          returning: ['id', '_number']
        });

        expect(newLinkPhysical.length).toBe(1);
        expect(newLinkPhysical[0]._number).toBe(numberReferenceId);
        debug(`New link reuses existing number UUID: ${newLinkPhysical[0]._number}`);

        // Verify still only one entry in _numbers table
        const finalNumbersData = await adminHasyx.select({
          table: 'deep__numbers',
          where: { data: { _eq: sharedNumber } },
          returning: ['id', 'data']
        });
        expect(finalNumbersData.length).toBe(1);

        debug('✅ Number deduplication test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link3Id } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should deduplicate function values automatically', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const link1Id = uuidv4();
      const link2Id = uuidv4();
      const link3Id = uuidv4();

      try {
        debug('Testing function deduplication...');

        const sharedFunction = 'function shared() { return "deduplication test"; }';

        // Create first link with function (id == _deep to allow NULL type_id)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL type_id
            function: sharedFunction
          },
          returning: ['id', 'function']
        });

        // Create second link with same function (id == _deep to allow NULL type_id)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL type_id
            function: sharedFunction
          },
          returning: ['id', 'function']
        });

        expect(link1.function).toBe(sharedFunction);
        expect(link2.function).toBe(sharedFunction);

        // Check that both links reference the same _function UUID in physical _links table
        const physicalLinks = await adminHasyx.select({
          table: 'deep__links',
          where: {
            id: { _in: [link1Id, link2Id] }
          },
          returning: ['id', '_function'],
          order_by: [{ id: 'asc' }]
        });

        debug('Physical links query result:', physicalLinks);

        expect(physicalLinks.length).toBe(2);
        expect(physicalLinks[0]._function).toBe(physicalLinks[1]._function);
        expect(physicalLinks[0]._function).toBeTruthy();

        const functionReferenceId = physicalLinks[0]._function;
        debug(`Both links reference the same function UUID: ${functionReferenceId}`);

        // Verify there's only one entry in _functions table for this value
        const functionsData = await adminHasyx.select({
          table: 'deep__functions',
          where: { data: { _eq: sharedFunction } },
          returning: ['id', 'data']
        });
        expect(functionsData.length).toBe(1);

        // Delete both links
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } });
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } });

        // Verify links are deleted but function value remains in _functions table
        const remainingLinks = await adminHasyx.select({
          table: 'deep_links',
          where: {
            _or: [
              { id: { _eq: link1Id } },
              { id: { _eq: link2Id } }
            ]
          },
          returning: ['id']
        });
        expect(remainingLinks.length).toBe(0);

        const remainingFunctions = await adminHasyx.select({
          table: 'deep__functions',
          where: { data: { _eq: sharedFunction } },
          returning: ['id', 'data']
        });
        expect(remainingFunctions.length).toBe(1);
        expect(remainingFunctions[0].id).toBe(functionReferenceId);
        debug(`Function value preserved after link deletion: ${remainingFunctions[0].id}`);

        // Create new link with same function value
        const link3 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link3Id,
            _deep: link3Id,  // id == _deep allows NULL type_id
            function: sharedFunction
          },
          returning: ['id', 'function']
        });

        expect(link3.function).toBe(sharedFunction);

        // Verify new link uses the existing deduplicated function
        const newLinkPhysical = await adminHasyx.select({
          table: 'deep__links',
          where: { id: { _eq: link3Id } },
          returning: ['id', '_function']
        });

        expect(newLinkPhysical.length).toBe(1);
        expect(newLinkPhysical[0]._function).toBe(functionReferenceId);
        debug(`New link reuses existing function UUID: ${newLinkPhysical[0]._function}`);

        // Verify still only one entry in _functions table
        const finalFunctionsData = await adminHasyx.select({
          table: 'deep__functions',
          where: { data: { _eq: sharedFunction } },
          returning: ['id', 'data']
        });
        expect(finalFunctionsData.length).toBe(1);

        debug('✅ Function deduplication test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link3Id } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should deduplicate object values automatically', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const link1Id = uuidv4();
      const link2Id = uuidv4();
      const link3Id = uuidv4();

      try {
        debug('Testing object deduplication...');

        const sharedObject = { key: 'value', nested: { array: [1, 'a', true] } };

        // Create first link with object (id == _deep to allow NULL type_id)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL type_id
            object: sharedObject
          },
          returning: ['id', 'object']
        });

        // Create second link with same object (id == _deep to allow NULL type_id)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL type_id
            object: sharedObject
          },
          returning: ['id', 'object']
        });

        expect(link1.object).toEqual(sharedObject);
        expect(link2.object).toEqual(sharedObject);

        // Check that both links reference the same _object UUID in physical _links table
        const physicalLinks = await adminHasyx.select({
          table: 'deep__links',
          where: {
            id: { _in: [link1Id, link2Id] }
          },
          returning: ['id', '_object'],
          order_by: [{ id: 'asc' }]
        });

        debug('Physical links query result:', physicalLinks);

        expect(physicalLinks.length).toBe(2);
        expect(physicalLinks[0]._object).toBe(physicalLinks[1]._object);
        expect(physicalLinks[0]._object).toBeTruthy();

        const objectReferenceId = physicalLinks[0]._object;
        debug(`Both links reference the same object UUID: ${objectReferenceId}`);

        // Verify there's only one entry in _objects table for this value
        const objectsData = await adminHasyx.select({
          table: 'deep__objects',
          where: { data: { _eq: sharedObject } },
          returning: ['id', 'data']
        });
        expect(objectsData.length).toBe(1);

        // Delete both links
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } });
        await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } });

        // Verify links are deleted but object value remains in _objects table
        const remainingLinks = await adminHasyx.select({
          table: 'deep_links',
          where: {
            _or: [
              { id: { _eq: link1Id } },
              { id: { _eq: link2Id } }
            ]
          },
          returning: ['id']
        });
        expect(remainingLinks.length).toBe(0);

        const remainingObjects = await adminHasyx.select({
          table: 'deep__objects',
          where: { data: { _eq: sharedObject } },
          returning: ['id', 'data']
        });
        expect(remainingObjects.length).toBe(1);
        expect(remainingObjects[0].id).toBe(objectReferenceId);
        debug(`Object value preserved after link deletion: ${remainingObjects[0].id}`);

        // Create new link with same object value
        const link3 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link3Id,
            _deep: link3Id,  // id == _deep allows NULL type_id
            object: sharedObject
          },
          returning: ['id', 'object']
        });

        expect(link3.object).toEqual(sharedObject);

        // Verify new link uses the existing deduplicated object
        const newLinkPhysical = await adminHasyx.select({
          table: 'deep__links',
          where: { id: { _eq: link3Id } },
          returning: ['id', '_object']
        });

        expect(newLinkPhysical.length).toBe(1);
        expect(newLinkPhysical[0]._object).toBe(objectReferenceId);
        debug(`New link reuses existing object UUID: ${newLinkPhysical[0]._object}`);

        // Verify still only one entry in _objects table
        const finalObjectsData = await adminHasyx.select({
          table: 'deep__objects',
          where: { data: { _eq: sharedObject } },
          returning: ['id', 'data']
        });
        expect(finalObjectsData.length).toBe(1);

        debug('✅ Object deduplication test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link3Id } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });
  });

  describe('Deep Space Tests', () => {
    it('should handle _deep field for space isolation', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const space1Id = uuidv4();
      const space2Id = uuidv4();
      const link1Id = uuidv4();
      const link2Id = uuidv4();

      try {
        debug('Testing _deep field for space isolation...');

        // Create root links for each space (id == _deep to allow NULL type_id)
        const space1Root = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: space1Id,
            _deep: space1Id,  // id == _deep allows NULL type_id
            string: 'Space 1 Root'
          },
          returning: ['id']
        });

        const space2Root = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: space2Id,
            _deep: space2Id,  // id == _deep allows NULL type_id
            string: 'Space 2 Root'
          },
          returning: ['id']
        });

        // Create links in different spaces using roots as type_id
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: space1Id,
            type_id: space1Id,  // Use root as type
            string: 'Space 1 Link'
          },
          returning: ['id', '_deep', 'string']
        });

        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: space2Id,
            type_id: space2Id,  // Use root as type
            string: 'Space 2 Link'
          },
          returning: ['id', '_deep', 'string']
        });

        expect(link1._deep).toBe(space1Id);
        expect(link2._deep).toBe(space2Id);

        // Query by space
        const space1Links = await adminHasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: space1Id } },
          returning: ['id', '_deep', 'string']
        });

        const space2Links = await adminHasyx.select({
          table: 'deep_links',
          where: { _deep: { _eq: space2Id } },
          returning: ['id', '_deep', 'string']
        });

        expect(space1Links.length).toBe(2); // Root + link
        expect(space2Links.length).toBe(2); // Root + link

        debug('✅ Deep space isolation test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: space1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: space2Id } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle deep relationship (same _deep value)', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const sharedDeepId = uuidv4();
      const link1Id = uuidv4();
      const link2Id = uuidv4();
      const link3Id = uuidv4();

      try {
        debug('Testing deep relationship...');

        // Create root link for the space (id == _deep to allow NULL type_id)
        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: sharedDeepId,
            _deep: sharedDeepId,  // id == _deep allows NULL type_id
            string: 'Deep Space Root'
          },
          returning: ['id']
        });

        // Create multiple links in same deep space using root as type_id
        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link1Id,
            _deep: sharedDeepId,
            type_id: sharedDeepId,  // Use root as type
            string: 'Deep Link 1'
          },
          returning: ['id']
        });

        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link2Id,
            _deep: sharedDeepId,
            type_id: sharedDeepId,  // Use root as type
            string: 'Deep Link 2'
          },
          returning: ['id']
        });

        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: link3Id,
            _deep: sharedDeepId,
            type_id: sharedDeepId,  // Use root as type
            string: 'Deep Link 3'
          },
          returning: ['id']
        });

        // Test deep relationship
        const linkWithDeepRelations = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: link1Id } },
          returning: [
            'id',
            '_deep',
            'string',
            { deep: ['id', 'string'] }
          ]
        });

        debug('Link with deep relations:', linkWithDeepRelations);

        expect(linkWithDeepRelations.length).toBe(1);
        expect(linkWithDeepRelations[0].deep.length).toBe(4); // Root + 3 links in same space

        const deepIds = linkWithDeepRelations[0].deep.map((d: any) => d.id);
        expect(deepIds).toContain(sharedDeepId); // Root
        expect(deepIds).toContain(link1Id);
        expect(deepIds).toContain(link2Id);
        expect(deepIds).toContain(link3Id);

        debug('✅ Deep relationship test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link1Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link2Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: link3Id } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: sharedDeepId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });
  });

  describe('UPSERT Tests', () => {
    it('should insert new record when id does not exist', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();
      const initialTimestamp = Date.now();

      try {
        debug('Testing INSERT behavior in UPSERT when record does not exist...');

        // INSERT new record (should work like regular insert)
        debug('1. UPSERT INSERT: Creating new link...');
        const insertResult = await adminHasyx.upsert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: TEST_DEEP_SPACE_ID,
            type_id: TEST_DEEP_SPACE_ID,
            string: 'Initial Value',
            number: 100,
            created_at: initialTimestamp,
            updated_at: initialTimestamp,
            _i: 1,
          },
          on_conflict: {
            constraint: '_links_pkey',
            update_columns: ['string', 'number', 'updated_at']
          },
          returning: ['id', 'string', 'number', 'created_at', 'updated_at', '_i']
        });

        expect(insertResult).toBeDefined();
        expect(insertResult.id).toBe(linkId);
        expect(insertResult.string).toBe('Initial Value');
        expect(insertResult.number).toBe(100);
        expect(insertResult.created_at).toBe(initialTimestamp);
        expect(typeof insertResult._i).toBe('number'); // Just check it's a number, not specific value
        debug('✅ UPSERT INSERT successful');

        // 2. SELECT to verify insert
        debug('2. SELECT: Verifying link creation...');
        const selectAfterInsertResults = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'string', 'number', 'created_at', 'updated_at', '_i']
        });

        expect(selectAfterInsertResults).toBeDefined();
        expect(Array.isArray(selectAfterInsertResults)).toBe(true);
        expect(selectAfterInsertResults.length).toBe(1);
        const selectAfterInsert = selectAfterInsertResults[0];
        expect(selectAfterInsert.id).toBe(linkId);
        expect(selectAfterInsert.string).toBe('Initial Value');
        expect(selectAfterInsert.number).toBe(100);
        expect(selectAfterInsert.created_at).toBe(initialTimestamp);
        expect(typeof selectAfterInsert._i).toBe('number'); // Database auto-generated sequence
        debug('✅ SELECT after INSERT verified');

        // Store the actual _i value for consistency checks
        const actualI = selectAfterInsert._i;

        // 3. UPSERT (acting as UPDATE) - update existing link
        const updateTimestamp = Date.now();
        debug('3. UPSERT UPDATE: Updating existing link...');
        const updateResult = await adminHasyx.upsert({
          table: 'deep_links',
          object: {
            id: linkId, // Same ID to trigger UPDATE via on_conflict
            _deep: TEST_DEEP_SPACE_ID,
            type_id: TEST_DEEP_SPACE_ID,
            string: 'Updated Value',
            number: 200,
            function: 'function test() { return "updated"; }',
            object: { updated: true },
            created_at: initialTimestamp, // Should NOT be updated
            updated_at: updateTimestamp,
            _i: 999, // This should be ignored and not updated (immutable)
          },
          on_conflict: {
            constraint: '_links_pkey',
            update_columns: ['string', 'number', 'function', 'object', 'updated_at']
            // Note: NOT updating created_at and _i - they should remain immutable
          },
          returning: ['id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at', '_i']
        });

        expect(updateResult).toBeDefined();
        expect(updateResult.id).toBe(linkId);
        expect(updateResult.string).toBe('Updated Value');
        expect(updateResult.number).toBe(200);
        expect(updateResult.function).toBe('function test() { return "updated"; }');
        expect(updateResult.object).toEqual({ updated: true });
        expect(updateResult.created_at).toBe(initialTimestamp); // Should remain unchanged
        expect(updateResult.updated_at).toBe(updateTimestamp); // Should be updated
        // We will check the immutability of _i from the subsequent SELECT, 
        // as the 'returning' clause of UPSERT might reflect the attempted input for _i.
        // expect(updateResult._i).toBe(actualI); 
        debug('✅ UPSERT UPDATE successful');

        // 4. SELECT to verify update
        debug('4. SELECT: Verifying link update...');
        const selectAfterUpdateResults = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'string', 'number', 'function', 'object', 'created_at', 'updated_at', '_i']
        });

        expect(selectAfterUpdateResults).toBeDefined();
        expect(Array.isArray(selectAfterUpdateResults)).toBe(true);
        expect(selectAfterUpdateResults.length).toBe(1);
        const selectAfterUpdate = selectAfterUpdateResults[0];
        expect(selectAfterUpdate.id).toBe(linkId);
        expect(selectAfterUpdate.string).toBe('Updated Value');
        expect(selectAfterUpdate.number).toBe(200);
        expect(selectAfterUpdate.function).toBe('function test() { return "updated"; }');
        expect(selectAfterUpdate.object).toEqual({ updated: true });
        expect(selectAfterUpdate.created_at).toBe(initialTimestamp); // Should remain unchanged
        expect(selectAfterUpdate.updated_at).toBeGreaterThanOrEqual(updateTimestamp);
        expect(selectAfterUpdate.updated_at).toBeGreaterThan(initialTimestamp);
        expect(selectAfterUpdate._i).toBe(actualI); // Should remain unchanged
        debug('✅ SELECT after UPDATE verified');

        // 5. DELETE
        debug('5. DELETE: Removing link...');
        const deleteResult = await adminHasyx.delete({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id']
        });

        expect(deleteResult).toBeDefined();
        expect(deleteResult.affected_rows).toBe(1);
        expect(Array.isArray(deleteResult.returning)).toBe(true);
        expect(deleteResult.returning.length).toBe(1);
        expect(deleteResult.returning[0].id).toBe(linkId);
        debug('✅ DELETE successful');

        // 6. SELECT to verify deletion
        debug('6. SELECT: Verifying link deletion...');
        const selectAfterDeleteResults = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id']
        });

        expect(selectAfterDeleteResults).toBeDefined();
        expect(Array.isArray(selectAfterDeleteResults)).toBe(true);
        expect(selectAfterDeleteResults.length).toBe(0);
        debug('✅ SELECT after DELETE verified - link properly deleted');

        debug('✅ Complete UPSERT cycle test passed');

      } catch (error) {
        debug('❌ Error in complete UPSERT cycle test:', error);
        throw error;
      } finally {
        try {
          // Cleanup in case test failed before DELETE step
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle UPSERT with different _deep values', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId1 = uuidv4(); // First unique id
      const linkId2 = uuidv4(); // Second unique id  
      const deepSpace1 = uuidv4();
      const deepSpace2 = uuidv4();

      try {
        debug('Testing UPSERT with different _deep values...');

        // Create deep space roots
        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: deepSpace1,
            _deep: deepSpace1,
            string: 'Deep Space 1'
          },
          returning: ['id']
        });

        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: deepSpace2,
            _deep: deepSpace2,
            string: 'Deep Space 2'
          },
          returning: ['id']
        });

        // Create link in first deep space with unique id
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId1,
            _deep: deepSpace1,
            type_id: deepSpace1,
            string: 'Link in Space 1'
          },
          returning: ['id', '_deep', 'string']
        });

        expect(link1.id).toBe(linkId1);
        expect(link1._deep).toBe(deepSpace1);
        expect(link1.string).toBe('Link in Space 1');

        // Create link with different id in second deep space
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId2, // Different id, not same as linkId1
            _deep: deepSpace2,
            type_id: deepSpace2,
            string: 'Link in Space 2'
          },
          returning: ['id', '_deep', 'string']
        });

        expect(link2.id).toBe(linkId2);
        expect(link2._deep).toBe(deepSpace2);
        expect(link2.string).toBe('Link in Space 2');

        // Test UPSERT on existing link in first space
        const updatedLink1 = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId1,
            _deep: deepSpace1,
            type_id: deepSpace1,
            string: 'Updated Link in Space 1',
            number: 42
          },
          returning: ['id', '_deep', 'string', 'number']
        });

        expect(updatedLink1.id).toBe(linkId1);
        expect(updatedLink1._deep).toBe(deepSpace1);
        expect(updatedLink1.string).toBe('Updated Link in Space 1');
        expect(updatedLink1.number).toBe(42);

        // Verify both links exist with different ids
        const allLinks = await adminHasyx.select({
          table: 'deep_links',
          where: { 
            _or: [
              { id: { _eq: linkId1 } },
              { id: { _eq: linkId2 } }
            ]
          },
          returning: ['id', '_deep', 'string', 'number']
        });

        expect(allLinks.length).toBe(2);
        
        const linkById = allLinks.reduce((acc, link) => {
          acc[link.id] = link;
          return acc;
        }, {} as any);
        
        expect(linkById[linkId1]._deep).toBe(deepSpace1);
        expect(linkById[linkId1].string).toBe('Updated Link in Space 1');
        expect(linkById[linkId1].number).toBe(42);
        
        expect(linkById[linkId2]._deep).toBe(deepSpace2);
        expect(linkById[linkId2].string).toBe('Link in Space 2');

        debug('✅ UPSERT with different _deep test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId1 } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId2 } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: deepSpace1 } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: deepSpace2 } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });

    it('should handle UPSERT with relationships and data types', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();

      const linkId = uuidv4();
      const typeId = uuidv4();
      const fromId = uuidv4();
      const toId = uuidv4();

      try {
        debug('Testing UPSERT with complex relationships and data...');

        // Create relationship targets
        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: typeId,
            _deep: typeId,
            string: 'Type Link'
          },
          returning: ['id']
        });

        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: fromId,
            _deep: fromId,
            string: 'From Link'
          },
          returning: ['id']
        });

        await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: toId,
            _deep: toId,
            string: 'To Link'
          },
          returning: ['id']
        });

        // Create initial link with relationships
        const initialLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: TEST_DEEP_SPACE_ID,
            type_id: typeId,
            from_id: fromId,
            string: 'Initial String',
            number: 100
          },
          returning: ['id', 'type_id', 'from_id', 'to_id', 'string', 'number']
        });

        expect(initialLink.type_id).toBe(typeId);
        expect(initialLink.from_id).toBe(fromId);
        expect(initialLink.to_id).toBeNull();
        expect(initialLink.string).toBe('Initial String');
        expect(initialLink.number).toBe(100);

        // UPSERT (update) with new relationships and data
        const upsertedLink = await adminHasyx.insert({
          table: 'deep_links',
          object: {
            id: linkId,
            _deep: TEST_DEEP_SPACE_ID,
            type_id: typeId,
            from_id: fromId,
            to_id: toId,  // Add to_id relationship
            string: 'Updated String',
            number: 200,
            function: 'function test() { return "new"; }',
            object: { key: 'value' }
          },
          returning: ['id', 'type_id', 'from_id', 'to_id', 'string', 'number', 'function', 'object']
        });

        expect(upsertedLink.type_id).toBe(typeId);
        expect(upsertedLink.from_id).toBe(fromId);
        expect(upsertedLink.to_id).toBe(toId);  // Now should have to_id
        expect(upsertedLink.string).toBe('Updated String');
        expect(upsertedLink.number).toBe(200);
        expect(upsertedLink.function).toBe('function test() { return "new"; }');
        expect(upsertedLink.object).toEqual({ key: 'value' });

        // Verify in database
        const verifyLinks = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'type_id', 'from_id', 'to_id', 'string', 'number', 'function', 'object']
        });

        expect(verifyLinks.length).toBe(1);
        const link = verifyLinks[0];
        expect(link.type_id).toBe(typeId);
        expect(link.from_id).toBe(fromId);
        expect(link.to_id).toBe(toId);
        expect(link.string).toBe('Updated String');
        expect(link.number).toBe(200);
        expect(link.function).toBe('function test() { return "new"; }');
        expect(link.object).toEqual({ key: 'value' });

        debug('✅ UPSERT with relationships test passed');

      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: linkId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: typeId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: fromId } } }).catch(() => { });
          await adminHasyx.delete({ table: 'deep_links', where: { id: { _eq: toId } } }).catch(() => { });
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        await cleanup();
      }
    });
  });
}); 