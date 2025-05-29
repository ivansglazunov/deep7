import { Hasyx } from 'hasyx';
import { v4 as uuidv4 } from 'uuid';
import { newDeep } from '.';
import Debug from './debug';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';

dotenv.config();

// Initialize debug for this test suite
const debug = Debug('test:hasyx-links');
const generate = Generator(schema as any);

// --- Test Configuration ---
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
  _type?: string;
  _from?: string;
  _to?: string;
  _value?: string;
  string?: string;
  number?: number;
  function?: string;
}

describe('Hasyx Links Integration Tests', () => {

  describe('Basic CRUD Operations', () => {
    it('should perform CRUD operations on links VIEW table', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const testLinkId = uuidv4();
      let newTypeId: string;
      let typeTargetLink: any;
      
      try {
        debug('Testing basic CRUD operations on links VIEW...');
        
        // CREATE - Insert into links VIEW (with id == _deep to allow NULL _type)
        debug(`Creating new test link with ID: ${testLinkId}`);
        
        const initialLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: testLinkId,
            _deep: testLinkId  // id == _deep allows NULL _type
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
          returning: ['id', '_type', '_from', '_to', '_value', 'string', 'number', 'function']
        });
        
        debug('Result of select operation:', selectedLinks);
        
        expect(selectedLinks).toBeDefined();
        expect(Array.isArray(selectedLinks)).toBe(true);
        expect(selectedLinks.length).toBeGreaterThan(0);
        expect(selectedLinks[0].id).toBe(testLinkId);
        
        // Test UPDATE with _type reference
        newTypeId = uuidv4();
        debug(`Creating a link to use as _type with ID: ${newTypeId}`);
        
        // Create a valid link for _type (with id == _deep to allow NULL _type)
        typeTargetLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: newTypeId,
            _deep: newTypeId  // id == _deep allows NULL _type
          },
          returning: 'id'
        });
        debug('Result of insert for type target:', typeTargetLink);

        debug(`Updating link ${testLinkId} to set _type to ${newTypeId}`);
        const updateResponse = await adminHasyx.update({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          _set: { _type: typeTargetLink.id },
          returning: ['id', '_type']
        });
        
        debug('Result of update operation:', updateResponse);
        
        expect(updateResponse).toBeDefined();
        expect(updateResponse.returning).toBeDefined();
        expect(updateResponse.returning.length).toBeGreaterThan(0);
        const updatedLink = updateResponse.returning[0];
        expect(updatedLink.id).toBe(testLinkId);
        expect(updatedLink._type).toBe(typeTargetLink.id);
        
        // Verify update with select
        debug(`Verifying update by selecting link ${testLinkId} again`);
        const verifyLinks = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          returning: ['id', '_type']
        });
        
        debug('Result of select for verification:', verifyLinks);
        
        expect(verifyLinks).toBeDefined();
        expect(Array.isArray(verifyLinks)).toBe(true);
        expect(verifyLinks.length).toBeGreaterThan(0);
        expect(verifyLinks[0]._type).toBe(typeTargetLink.id);
        
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
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeTargetLink.id}}});
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: testLinkId}}}).catch(() => {});
          if (typeTargetLink) {
            await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeTargetLink.id}}}).catch(() => {});
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
            _deep: linkId,  // id == _deep allows NULL _type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
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
            _deep: linkId,  // id == _deep allows NULL _type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
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
            _deep: linkId,  // id == _deep allows NULL _type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
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
        
        // Create link with all data types
        const linkWithAllData = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: linkId,
            _deep: linkId,  // id == _deep allows NULL _type
            string: testString,
            number: testNumber,
            function: testFunction
          },
          returning: ['id', 'string', 'number', 'function']
        });
        
        debug('Result of insert with all data:', linkWithAllData);
        
        expect(linkWithAllData.id).toBe(linkId);
        expect(linkWithAllData.string).toBe(testString);
        expect(linkWithAllData.number).toBe(testNumber);
        expect(linkWithAllData.function).toBe(testFunction);
        
        // Verify all data persists
        const selectedLink = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id', 'string', 'number', 'function']
        });
        
        expect(selectedLink.length).toBe(1);
        expect(selectedLink[0].string).toBe(testString);
        expect(selectedLink[0].number).toBe(testNumber);
        expect(selectedLink[0].function).toBe(testFunction);
        
        debug('✅ Multiple data fields test passed');
        
      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
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
            _deep: typeId,  // id == _deep allows NULL _type
            string: 'Type'
          },
          returning: ['id']
        });
        
        // Create from link
        const fromLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: fromId,
            _deep: fromId,  // id == _deep allows NULL _type
            string: 'From'
          },
          returning: ['id']
        });
        
        // Create to link
        const toLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: toId,
            _deep: toId,  // id == _deep allows NULL _type
            string: 'To'
          },
          returning: ['id']
        });
        
        // Create value link
        const valueLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: valueId,
            _deep: valueId,  // id == _deep allows NULL _type
            string: 'Value'
          },
          returning: ['id']
        });
        
        // Create main link with all relationships
        const mainLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: linkId,
            _deep: TEST_DEEP_SPACE_ID,  // Different _deep, so _type is required
            _type: typeId,
            _from: fromId,
            _to: toId,
            _value: valueId
          },
          returning: ['id', '_type', '_from', '_to', '_value']
        });
        
        debug('Result of insert with relationships:', mainLink);
        
        expect(mainLink.id).toBe(linkId);
        expect(mainLink._type).toBe(typeId);
        expect(mainLink._from).toBe(fromId);
        expect(mainLink._to).toBe(toId);
        expect(mainLink._value).toBe(valueId);
        
        // Test relationships using GraphQL
        const linkWithRelations = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: [
            'id', 
            '_type', 
            '_from', 
            '_to', 
            '_value',
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: fromId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: toId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: valueId}}}).catch(() => {});
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
        
        // Create type link - use id == _deep to allow NULL _type
        const typeLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: typeId,
            _deep: typeId,  // id == _deep allows NULL _type
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
            _type: typeId,
            string: 'Instance1'
          },
          returning: ['id', '_type']
        });
        
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link2Id,
            _deep: TEST_DEEP_SPACE_ID,
            _type: typeId,
            string: 'Instance2'
          },
          returning: ['id', '_type']
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeId}}}).catch(() => {});
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
          await cleanup();
        }
    });
      });

  describe('Data Integrity Tests', () => {
    it('should enforce referential integrity for link references', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      const nonExistentId = uuidv4();
      
      try {
        debug('Testing referential integrity...');
        
        // Try to create link with non-existent _type
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _type: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();
        
        // Try to create link with non-existent _from
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _from: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();
        
        // Try to create link with non-existent _to
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _to: nonExistentId
          },
          returning: 'id'
        })).rejects.toThrow();
        
        // Try to create link with non-existent _value
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _value: nonExistentId
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

    it('should enforce _type rule: _type can only be NULL if id == _deep', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      const linkId1 = uuidv4();
      const linkId2 = uuidv4();
      const deepId = uuidv4();
      
      try {
        debug('Testing _type validation rule...');
        
        // This should work: id == _deep allows NULL _type
        const validLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: linkId1,
            _deep: linkId1,  // id == _deep, so _type can be NULL
            string: 'Valid link with NULL _type'
          },
          returning: ['id', '_type', '_deep']
        });
        
        expect(validLink.id).toBe(linkId1);
        expect(validLink._type).toBeNull();
        expect(validLink._deep).toBe(linkId1);
        
        // This should fail: id != _deep but _type is NULL (implicit)
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: linkId2,
            _deep: deepId,  // id != _deep, so _type cannot be NULL
            string: 'Invalid link with NULL _type'
          },
          returning: 'id'
        })).rejects.toThrow();
        
        debug('✅ _type validation rule test passed');
        
      } catch (error) {
        debug('Error in test:', error);
        throw error;
      } finally {
        try {
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId1}}}).catch(() => {});
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
        
        // Create first link with string (id == _deep to allow NULL _type)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL _type
            string: sharedString
          },
          returning: ['id', 'string']
        });
        
        // Create second link with same string (id == _deep to allow NULL _type)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL _type
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
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}});
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}});
        
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
            _deep: link3Id,  // id == _deep allows NULL _type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link3Id}}}).catch(() => {});
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
        
        // Create first link with number (id == _deep to allow NULL _type)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL _type
            number: sharedNumber
          },
          returning: ['id', 'number']
        });
        
        // Create second link with same number (id == _deep to allow NULL _type)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL _type
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
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}});
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}});
        
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
            _deep: link3Id,  // id == _deep allows NULL _type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link3Id}}}).catch(() => {});
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
        
        // Create first link with function (id == _deep to allow NULL _type)
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link1Id,
            _deep: link1Id,  // id == _deep allows NULL _type
            function: sharedFunction
          },
          returning: ['id', 'function']
        });
        
        // Create second link with same function (id == _deep to allow NULL _type)
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link2Id,
            _deep: link2Id,  // id == _deep allows NULL _type
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
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}});
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}});
        
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
            _deep: link3Id,  // id == _deep allows NULL _type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link3Id}}}).catch(() => {});
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
        
        // Create root links for each space (id == _deep to allow NULL _type)
        const space1Root = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: space1Id,
            _deep: space1Id,  // id == _deep allows NULL _type
            string: 'Space 1 Root'
          },
          returning: ['id']
        });
        
        const space2Root = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: space2Id,
            _deep: space2Id,  // id == _deep allows NULL _type
            string: 'Space 2 Root'
          },
          returning: ['id']
        });
        
        // Create links in different spaces using roots as _type
        const link1 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link1Id,
            _deep: space1Id,
            _type: space1Id,  // Use root as type
            string: 'Space 1 Link'
          },
          returning: ['id', '_deep', 'string']
        });
        
        const link2 = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: link2Id,
            _deep: space2Id,
            _type: space2Id,  // Use root as type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: space1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: space2Id}}}).catch(() => {});
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
        
        // Create root link for the space (id == _deep to allow NULL _type)
        await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: sharedDeepId,
            _deep: sharedDeepId,  // id == _deep allows NULL _type
            string: 'Deep Space Root'
          },
          returning: ['id']
        });
        
        // Create multiple links in same deep space using root as _type
        await adminHasyx.insert({
            table: 'deep_links',
            object: { 
            id: link1Id,
            _deep: sharedDeepId,
            _type: sharedDeepId,  // Use root as type
            string: 'Deep Link 1'
            },
            returning: ['id']
          });
          
        await adminHasyx.insert({
            table: 'deep_links',
            object: { 
            id: link2Id,
            _deep: sharedDeepId,
            _type: sharedDeepId,  // Use root as type
            string: 'Deep Link 2'
            },
            returning: ['id']
          });
          
          await adminHasyx.insert({
          table: 'deep_links',
            object: { 
            id: link3Id,
            _deep: sharedDeepId,
            _type: sharedDeepId,  // Use root as type
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
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link1Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link2Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: link3Id}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: sharedDeepId}}}).catch(() => {});
          } catch (cleanupError) {
            debug('Error during cleanup:', cleanupError);
          }
          await cleanup();
        }
    });
  });
}); 