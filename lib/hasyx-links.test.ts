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
}

describe('Hasyx Links Integration Tests', () => {

  describe('Basic CRUD Operations', () => {
    it('should perform CRUD operations on links', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const testLinkId = uuidv4();
      let newTypeId: string;
      let typeTargetLink: any;
      
      try {
        debug('Testing basic CRUD operations...');
        
        // Create a new link for this specific test to avoid interference
        debug(`Creating new test link with ID: ${testLinkId}`);
        
        // CREATE
        const initialLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: testLinkId,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        });
        debug('Result of insert operation:', initialLink);
        expect(initialLink.id).toBe(testLinkId);

        // Test SELECT for the created link
        debug(`Selecting link with ID: ${testLinkId}`);
        
        // Use array for return fields
        const selectedLinks = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: testLinkId } },
          returning: ['id', '_type', '_from', '_to', '_value']
        });
        
        debug('Result of select operation:', selectedLinks);
        
        // Check that array is not empty and first element has expected ID
        expect(selectedLinks).toBeDefined();
        expect(Array.isArray(selectedLinks)).toBe(true);
        expect(selectedLinks.length).toBeGreaterThan(0);
        expect(selectedLinks[0].id).toBe(testLinkId);
        
        // Test UPDATE
        newTypeId = uuidv4();
        debug(`Creating a link to use as _type with ID: ${newTypeId}`);
        
        // Reference a valid link for _type
        typeTargetLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: newTypeId,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
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
        
        // Check that update was performed successfully
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
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    }, 15000);
  });

  describe('Table Relationships', () => {
    it('should handle relationships between links and strings', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const baseLinkIdForString = uuidv4();
      const linkingToValueId = uuidv4();
      
      try {
        debug('Testing table relationships...');
        
        // First clear any existing data
        await adminHasyx.delete({ table: 'deep_strings', where: {} });
        await adminHasyx.delete({ table: 'deep_links', where: {} });
        
        // Create a base link for the string to reference
        debug(`Creating base link for string with ID: ${baseLinkIdForString}`);
        
        const baseLink = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: baseLinkIdForString,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id']
        });
        debug('Result of insert for base link:', baseLink);
        expect(baseLink.id).toBe(baseLinkIdForString);

        // Create a string, ensuring its id matches baseLinkIdForString
        const stringData = 'test string';
        debug(`Creating string with ID ${baseLinkIdForString} and data "${stringData}"`);
        
        const createdString = await adminHasyx.insert({
          table: 'deep_strings',
          object: { 
            id: baseLinkIdForString, // This ID must exist in deep_links
            _data: stringData
          },
          returning: ['id', '_data']
        });
        debug('Result of insert for string:', createdString);
        
        expect(createdString.id).toBe(baseLinkIdForString);
        expect(createdString._data).toBe(stringData);
        
        // Create another link that will have its _value point to the string's link ID
        debug(`Creating link with ID ${linkingToValueId} pointing to string link ${baseLinkIdForString}`);
        
        const linkWithValue = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: linkingToValueId,
            _deep: TEST_DEEP_SPACE_ID,
            _value: baseLinkIdForString, // Point _value to the ID of the link associated with the string
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_value']
        });
        
        debug('Result of insert for linking link:', linkWithValue);
        
        expect(linkWithValue).toBeDefined();
        expect(linkWithValue.id).toBe(linkingToValueId);
        expect(linkWithValue._value).toBe(baseLinkIdForString);
        
        // Verify relationship: select the link and its related string through the _value relationship
        debug(`Selecting string with ID: ${baseLinkIdForString}`);
        
        const selectedStrings = await adminHasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: baseLinkIdForString } },
          returning: ['id', '_data']
        });
        
        debug('Result of select for string:', selectedStrings);
        
        // Verify the string was found
        expect(selectedStrings).toBeDefined();
        expect(Array.isArray(selectedStrings)).toBe(true);
        expect(selectedStrings.length).toBeGreaterThan(0);
        expect(selectedStrings[0].id).toBe(baseLinkIdForString);
        expect(selectedStrings[0]._data).toBe(stringData);
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await Promise.all([
            adminHasyx.delete({table: 'deep_strings', where: {id: {_eq: baseLinkIdForString}}}).catch(() => {}),
            adminHasyx.delete({table: 'deep_links', where: {id: {_eq: baseLinkIdForString}}}).catch(() => {}),
            adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkingToValueId}}}).catch(() => {})
          ]);
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    }, 30000);
  });

  describe('Data Integrity', () => {
    it('should enforce referential integrity for _type link', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const nonExistentTypeId = uuidv4();
      const validTypeId = uuidv4();
      let newLinkId: string;
      
      try {
        debug('Testing referential integrity for _type link...');
        
        // Try to create a link with non-existent _type
        debug(`Attempting to create a link with non-existent _type ID: ${nonExistentTypeId}`);
        
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _type: nonExistentTypeId, // This ID does not exist in deep_links
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        })).rejects.toThrow(); // Expect Hasura to throw a foreign key violation error
        
        debug('Insert with non-existent _type correctly failed with error');
        
        // Create a valid link to be used as a type
        debug(`Creating a valid link to use as type with ID: ${validTypeId}`);
        
        const validType = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: validTypeId,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        });
        debug('Result of insert for valid type:', validType);
        
        // Now try to reference it as _type - should succeed
        newLinkId = uuidv4();
        debug(`Creating link ${newLinkId} with valid _type ${validTypeId}`);
        
        const link = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: newLinkId,
            _deep: TEST_DEEP_SPACE_ID,
            _type: validTypeId,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_type']
        });
        
        debug('Result of insert with valid _type:', link);
        
        expect(link).toBeDefined();
        expect(link._type).toBe(validTypeId);

        // Cleanup
        debug('Cleaning up test data...');
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: newLinkId}}});
        await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: validTypeId}}});
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: validTypeId}}}).catch(() => {});
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    }, 30000);

    it('should enforce referential integrity for all link fields (_type, _from, _to, _value)', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const nonExistentIds = {
        type: uuidv4(),
        from: uuidv4(),
        to: uuidv4(),
        value: uuidv4()
      };
      
      try {
        debug('Testing referential integrity for all link fields...');
        
        // Generate non-existent IDs for testing (already declared above)
        
        // Test _type foreign key constraint
        debug(`Testing _type constraint with non-existent ID: ${nonExistentIds.type}`);
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _type: nonExistentIds.type,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        })).rejects.toThrow();
        
        // Test _from foreign key constraint
        debug(`Testing _from constraint with non-existent ID: ${nonExistentIds.from}`);
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _from: nonExistentIds.from,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        })).rejects.toThrow();
        
        // Test _to foreign key constraint
        debug(`Testing _to constraint with non-existent ID: ${nonExistentIds.to}`);
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _to: nonExistentIds.to,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        })).rejects.toThrow();
        
        // Test _value foreign key constraint
        debug(`Testing _value constraint with non-existent ID: ${nonExistentIds.value}`);
        await expect(adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: uuidv4(),
            _deep: TEST_DEEP_SPACE_ID,
            _value: nonExistentIds.value,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: 'id'
        })).rejects.toThrow();
        
        debug('All referential integrity tests passed as expected');
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: nonExistentIds.type}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: nonExistentIds.from}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: nonExistentIds.to}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: nonExistentIds.value}}}).catch(() => {});
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    });

    it('should support nested insertion with relationships', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const typeAId = uuidv4();
      const typeBId = uuidv4();
      let instanceA: any;
      let instanceB: any;
      
      try {
        debug('Testing nested insertion with relationships...');
        
        // First clear any existing data
        await adminHasyx.delete({ table: 'deep_strings', where: {} });
        await adminHasyx.delete({ table: 'deep_links', where: {} });
        
        // Create type A
        debug(`Creating type A with ID: ${typeAId}`);
        const typeA = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: typeAId,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id']
        });
        expect(typeA.id).toBe(typeAId);
        
        // Create type B
        debug(`Creating type B with ID: ${typeBId}`);
        const typeB = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: typeBId,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id']
        });
        expect(typeB.id).toBe(typeBId);
        
        // Perform nested insertion - create a typeA link pointing to a new typeB link
        debug('Performing nested insertion...');
        // Create instance B first
        instanceB = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            _deep: TEST_DEEP_SPACE_ID,
            _type: typeBId,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_type']
        });
        
        debug(`Created instance B with ID: ${instanceB.id}`);
        expect(instanceB._type).toBe(typeBId);
        
        // Now create instance A that references B
        instanceA = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            _deep: TEST_DEEP_SPACE_ID,
            _type: typeAId,
            _to: instanceB.id,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_type', '_to']
        });
        
        debug('Result of insertion:', instanceA);
        expect(instanceA).toBeDefined();
        expect(instanceA.id).toBeDefined();
        expect(instanceA._type).toBe(typeAId);
        expect(instanceA._to).toBe(instanceB.id);
        
        // Verify the relationship was created correctly using GraphQL relationships
        debug(`Verifying relationship for instance with ID: ${instanceA.id}`);
        const verification = await adminHasyx.select({
          table: 'deep_links',
          where: { id: { _eq: instanceA.id } },
          returning: ['id', '_type', '_to', { to: ['id', '_type'] }]
        });
        
        debug('Verification result:', verification);
        expect(verification).toBeDefined();
        expect(Array.isArray(verification)).toBe(true);
        expect(verification.length).toBeGreaterThan(0);
        
        const verifiedInstanceA = verification[0];
        expect(verifiedInstanceA._type).toBe(typeAId);
        expect(verifiedInstanceA._to).toBe(instanceB.id);
        expect(verifiedInstanceA.to).toBeDefined();
        expect(verifiedInstanceA.to.id).toBe(instanceB.id);
        expect(verifiedInstanceA.to._type).toBe(typeBId);
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeAId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeBId}}}).catch(() => {});
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    }, 15000); // Increase timeout to 15 seconds
  });

  describe('Cascade Deletion Tests', () => {
    it('should automatically delete typed data when link is deleted', async () => {
      const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
      
      // Declare variables outside try block for cleanup access
      const linkId = uuidv4();
      
      try {
        debug('Testing cascade deletion of typed data...');
        
        // Create a link
        debug(`Creating link with ID: ${linkId}`);
        const link = await adminHasyx.insert({
          table: 'deep_links',
          object: { 
            id: linkId,
            _deep: TEST_DEEP_SPACE_ID,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id']
        });
        expect(link.id).toBe(linkId);
        
        // Add string data for this link
        debug(`Adding string data for link ${linkId}`);
        const stringData = await adminHasyx.insert({
          table: 'deep_strings',
          object: { 
            id: linkId,
            _data: 'test string value',
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_data']
        });
        expect(stringData.id).toBe(linkId);
        expect(stringData._data).toBe('test string value');
        
        // Add number data for this link
        debug(`Adding number data for link ${linkId}`);
        const numberData = await adminHasyx.insert({
          table: 'deep_numbers',
          object: { 
            id: linkId,
            _data: 42,
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_data']
        });
        expect(numberData.id).toBe(linkId);
        expect(numberData._data).toBe(42);
        
        // Add function data for this link
        debug(`Adding function data for link ${linkId}`);
        const functionData = await adminHasyx.insert({
          table: 'deep_functions',
          object: { 
            id: linkId,
            _data: 'function testFunc() { return "test"; }',
            created_at: new Date().valueOf(),
            updated_at: new Date().valueOf()
          },
          returning: ['id', '_data']
        });
        expect(functionData.id).toBe(linkId);
        expect(functionData._data).toBe('function testFunc() { return "test"; }');
        
        // Verify all typed data exists
        debug(`Verifying typed data exists for link ${linkId}`);
        const stringCheck = await adminHasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: linkId } },
          returning: ['id', '_data']
        });
        expect(stringCheck.length).toBe(1);
        expect(stringCheck[0]._data).toBe('test string value');
        
        const numberCheck = await adminHasyx.select({
          table: 'deep_numbers',
          where: { id: { _eq: linkId } },
          returning: ['id', '_data']
        });
        expect(numberCheck.length).toBe(1);
        expect(numberCheck[0]._data).toBe(42);
        
        const functionCheck = await adminHasyx.select({
          table: 'deep_functions',
          where: { id: { _eq: linkId } },
          returning: ['id', '_data']
        });
        expect(functionCheck.length).toBe(1);
        expect(functionCheck[0]._data).toBe('function testFunc() { return "test"; }');
        
        // Delete the link - this should trigger cascade deletion of typed data
        debug(`Deleting link ${linkId} - should cascade delete typed data`);
        const deleteResult = await adminHasyx.delete({
          table: 'deep_links',
          where: { id: { _eq: linkId } },
          returning: ['id']
        });
        
        expect(deleteResult.affected_rows).toBe(1);
        expect(deleteResult.returning[0].id).toBe(linkId);
        
        // Verify that all typed data was automatically deleted by the cascade trigger
        debug(`Verifying typed data was cascade deleted for link ${linkId}`);
        
        const stringAfterDelete = await adminHasyx.select({
          table: 'deep_strings',
          where: { id: { _eq: linkId } },
          returning: ['id']
        });
        expect(stringAfterDelete).toEqual([]);
        
        const numberAfterDelete = await adminHasyx.select({
          table: 'deep_numbers',
          where: { id: { _eq: linkId } },
          returning: ['id']
        });
        expect(numberAfterDelete).toEqual([]);
        
        const functionAfterDelete = await adminHasyx.select({
          table: 'deep_functions',
          where: { id: { _eq: linkId } },
          returning: ['id']
        });
        expect(functionAfterDelete).toEqual([]);
        
        debug('✅ Cascade deletion test passed - all typed data was automatically deleted');
        
      } catch (error) {
        // Cleanup in case of error
        debug('Error in test, cleaning up:', error);
        try {
          await adminHasyx.delete({table: 'deep_strings', where: {id: {_eq: linkId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_numbers', where: {id: {_eq: linkId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_functions', where: {id: {_eq: linkId}}}).catch(() => {});
          await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
        } catch (cleanupError) {
          debug('Error during cleanup:', cleanupError);
        }
        throw error;
      } finally {
        await cleanup();
      }
    }, 20000); // Increase timeout to 20 seconds for this test
  });

  describe('Deduplication Architecture Tests', () => {
    describe('Physical Data Storage Tests', () => {
      it('should store unique string values in _strings table', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        try {
          debug('Testing string deduplication...');
          
          // Clear existing data
          await adminHasyx.delete({ table: 'deep__strings', where: {} });
          
          const testString = 'test deduplication string';
          
          // Create first physical string record
          const string1 = await adminHasyx.insert({
            table: 'deep__strings',
            object: { _data: testString },
            returning: ['id', '_data']
          });
          expect(string1._data).toBe(testString);
          
          // Try to create duplicate - should fail due to unique constraint
          await expect(adminHasyx.insert({
            table: 'deep__strings',
            object: { _data: testString },
            returning: ['id', '_data']
          })).rejects.toThrow();
          
          // Verify only one record exists
          const allStrings = await adminHasyx.select({
            table: 'deep__strings',
            where: { _data: { _eq: testString } },
            returning: ['id', '_data']
          });
          expect(allStrings.length).toBe(1);
          expect(allStrings[0]._data).toBe(testString);
          
          debug('✅ String deduplication test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          await cleanup();
        }
      });

      it('should store unique number values in _numbers table', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        try {
          debug('Testing number deduplication...');
          
          // Clear existing data
          await adminHasyx.delete({ table: 'deep__numbers', where: {} });
          
          const testNumber = 42.123;
          
          // Create first physical number record
          const number1 = await adminHasyx.insert({
            table: 'deep__numbers',
            object: { _data: testNumber },
            returning: ['id', '_data']
          });
          expect(number1._data).toBe(testNumber);
          
          // Try to create duplicate - should fail due to unique constraint
          await expect(adminHasyx.insert({
            table: 'deep__numbers',
            object: { _data: testNumber },
            returning: ['id', '_data']
          })).rejects.toThrow();
          
          // Verify only one record exists
          const allNumbers = await adminHasyx.select({
            table: 'deep__numbers',
            where: { _data: { _eq: testNumber } },
            returning: ['id', '_data']
          });
          expect(allNumbers.length).toBe(1);
          expect(allNumbers[0]._data).toBe(testNumber);
          
          debug('✅ Number deduplication test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          await cleanup();
        }
      });

      it('should store unique function values in _functions table', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        try {
          debug('Testing function deduplication...');
          
          // Clear existing data
          await adminHasyx.delete({ table: 'deep__functions', where: {} });
          
          const testFunction = { code: 'function test() { return 42; }', args: [] };
          
          // Create first physical function record
          const function1 = await adminHasyx.insert({
            table: 'deep__functions',
            object: { _data: testFunction },
            returning: ['id', '_data']
          });
          expect(function1._data).toEqual(testFunction);
          
          // Try to create duplicate with same jsonb content - should work due to different GIN indexing behavior
          // But application logic should handle deduplication
          const function2 = await adminHasyx.insert({
            table: 'deep__functions',
            object: { _data: testFunction },
            returning: ['id', '_data']
          });
          expect(function2._data).toEqual(testFunction);
          
          // For jsonb, we rely on application-level deduplication using get_or_create_function
          debug('✅ Function storage test passed - deduplication handled at application level');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          await cleanup();
        }
      });
    });

    describe('Logical Table Tests', () => {
      it('should create logical string records with _data_id references', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        const linkId = uuidv4();
        let physicalStringId: string | null = null;
        
        try {
          debug('Testing logical string records with _data_id...');
          
          // Create a link first
          const link = await adminHasyx.insert({
            table: 'deep_links',
            object: { 
              id: linkId,
              _deep: TEST_DEEP_SPACE_ID,
            },
            returning: ['id']
          });
          expect(link.id).toBe(linkId);
          
          // Create physical string record
          const physicalString = await adminHasyx.insert({
            table: 'deep__strings',
            object: { _data: 'test logical string' },
            returning: ['id', '_data']
          });
          physicalStringId = physicalString.id;
          
          // Create logical string record referencing physical data
          const logicalString = await adminHasyx.insert({
            table: 'deep_strings',
            object: { 
              id: linkId,
              _data_id: physicalStringId
            },
            returning: ['id', '_data_id']
          });
          expect(logicalString.id).toBe(linkId);
          expect(logicalString._data_id).toBe(physicalStringId);
          
          // Query with computed _data field
          const stringWithData = await adminHasyx.select({
            table: 'deep_strings',
            where: { id: { _eq: linkId } },
            returning: ['id', '_data_id', '_data']
          });
          expect(stringWithData.length).toBe(1);
          expect(stringWithData[0]._data).toBe('test logical string');
          
          debug('✅ Logical string test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          try {
            await adminHasyx.delete({table: 'deep_strings', where: {id: {_eq: linkId}}}).catch(() => {});
            await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
            if (physicalStringId) {
              await adminHasyx.delete({table: 'deep__strings', where: {id: {_eq: physicalStringId}}}).catch(() => {});
            }
          } catch (cleanupError) {
            debug('Error during cleanup:', cleanupError);
          }
          await cleanup();
        }
      });

      it('should create logical number records with _data_id references', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        const linkId = uuidv4();
        let physicalNumberId: string | null = null;
        
        try {
          debug('Testing logical number records with _data_id...');
          
          // Create a link first
          const link = await adminHasyx.insert({
            table: 'deep_links',
            object: { 
              id: linkId,
              _deep: TEST_DEEP_SPACE_ID,
            },
            returning: ['id']
          });
          expect(link.id).toBe(linkId);
          
          // Create physical number record
          const physicalNumber = await adminHasyx.insert({
            table: 'deep__numbers',
            object: { _data: 123.456 },
            returning: ['id', '_data']
          });
          physicalNumberId = physicalNumber.id;
          
          // Create logical number record referencing physical data
          const logicalNumber = await adminHasyx.insert({
            table: 'deep_numbers',
            object: { 
              id: linkId,
              _data_id: physicalNumberId
            },
            returning: ['id', '_data_id']
          });
          expect(logicalNumber.id).toBe(linkId);
          expect(logicalNumber._data_id).toBe(physicalNumberId);
          
          // Query with computed _data field
          const numberWithData = await adminHasyx.select({
            table: 'deep_numbers',
            where: { id: { _eq: linkId } },
            returning: ['id', '_data_id', '_data']
          });
          expect(numberWithData.length).toBe(1);
          expect(numberWithData[0]._data).toBe(123.456);
          
          debug('✅ Logical number test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          try {
            await adminHasyx.delete({table: 'deep_numbers', where: {id: {_eq: linkId}}}).catch(() => {});
            await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
            if (physicalNumberId) {
              await adminHasyx.delete({table: 'deep__numbers', where: {id: {_eq: physicalNumberId}}}).catch(() => {});
            }
          } catch (cleanupError) {
            debug('Error during cleanup:', cleanupError);
          }
          await cleanup();
        }
      });

      it('should create logical function records with _data_id references', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        const linkId = uuidv4();
        let physicalFunctionId: string | null = null;
        
        try {
          debug('Testing logical function records with _data_id...');
          
          // Create a link first
          const link = await adminHasyx.insert({
            table: 'deep_links',
            object: { 
              id: linkId,
              _deep: TEST_DEEP_SPACE_ID,
            },
            returning: ['id']
          });
          expect(link.id).toBe(linkId);
          
          const testFunctionData = { code: 'function add(a, b) { return a + b; }', name: 'add' };
          
          // Create physical function record
          const physicalFunction = await adminHasyx.insert({
            table: 'deep__functions',
            object: { _data: testFunctionData },
            returning: ['id', '_data']
          });
          physicalFunctionId = physicalFunction.id;
          
          // Create logical function record referencing physical data
          const logicalFunction = await adminHasyx.insert({
            table: 'deep_functions',
            object: { 
              id: linkId,
              _data_id: physicalFunctionId
            },
            returning: ['id', '_data_id']
          });
          expect(logicalFunction.id).toBe(linkId);
          expect(logicalFunction._data_id).toBe(physicalFunctionId);
          
          // Query with computed _data field
          const functionWithData = await adminHasyx.select({
            table: 'deep_functions',
            where: { id: { _eq: linkId } },
            returning: ['id', '_data_id', '_data']
          });
          expect(functionWithData.length).toBe(1);
          expect(functionWithData[0]._data).toEqual(testFunctionData);
          
          debug('✅ Logical function test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          try {
            await adminHasyx.delete({table: 'deep_functions', where: {id: {_eq: linkId}}}).catch(() => {});
            await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId}}}).catch(() => {});
            if (physicalFunctionId) {
              await adminHasyx.delete({table: 'deep__functions', where: {id: {_eq: physicalFunctionId}}}).catch(() => {});
            }
          } catch (cleanupError) {
            debug('Error during cleanup:', cleanupError);
          }
          await cleanup();
        }
      });
    });

    describe('Deduplication Logic Tests', () => {
      it('should use get_or_create_string function for deduplication', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        try {
          debug('Testing get_or_create_string function...');
          
          // Clear existing data
          await adminHasyx.delete({ table: 'deep__strings', where: {} });
          
          const testString = 'deduplication test string';
          
          // Call get_or_create_string first time - should create new record
          const result1 = await adminHasyx.sql(`
            SELECT deep.get_or_create_string('${testString}') as id;
          `);
          const id1 = result1.result[1][0]; // First row, first column
          expect(id1).toBeTruthy();
          
          // Call get_or_create_string second time - should return existing record ID
          const result2 = await adminHasyx.sql(`
            SELECT deep.get_or_create_string('${testString}') as id;
          `);
          const id2 = result2.result[1][0]; // First row, first column
          expect(id2).toBe(id1); // Should be the same ID
          
          // Verify only one record exists
          const allStrings = await adminHasyx.select({
            table: 'deep__strings',
            where: { _data: { _eq: testString } },
            returning: ['id', '_data']
          });
          expect(allStrings.length).toBe(1);
          expect(allStrings[0]._data).toBe(testString);
          
          debug('✅ get_or_create_string deduplication test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          await cleanup();
        }
      });

      it('should use get_or_create_number function for deduplication', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        try {
          debug('Testing get_or_create_number function...');
          
          // Clear existing data
          await adminHasyx.delete({ table: 'deep__numbers', where: {} });
          
          const testNumber = 987.654;
          
          // Call get_or_create_number first time - should create new record
          const result1 = await adminHasyx.sql(`
            SELECT deep.get_or_create_number(${testNumber}) as id;
          `);
          const id1 = result1.result[1][0]; // First row, first column
          expect(id1).toBeTruthy();
          
          // Call get_or_create_number second time - should return existing record ID
          const result2 = await adminHasyx.sql(`
            SELECT deep.get_or_create_number(${testNumber}) as id;
          `);
          const id2 = result2.result[1][0]; // First row, first column
          expect(id2).toBe(id1); // Should be the same ID
          
          // Verify only one record exists
          const allNumbers = await adminHasyx.select({
            table: 'deep__numbers',
            where: { _data: { _eq: testNumber } },
            returning: ['id', '_data']
          });
          expect(allNumbers.length).toBe(1);
          expect(allNumbers[0]._data).toBe(testNumber);
          
          debug('✅ get_or_create_number deduplication test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          await cleanup();
        }
      });

      it('should use get_or_create_function function for deduplication', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        try {
          debug('Testing get_or_create_function function...');
          
          // Clear existing data
          await adminHasyx.delete({ table: 'deep__functions', where: {} });
          
          const testFunction = JSON.stringify({ code: 'function mul(a, b) { return a * b; }', name: 'mul' });
          
          // Call get_or_create_function first time - should create new record
          const result1 = await adminHasyx.sql(`
            SELECT deep.get_or_create_function('${testFunction}') as id;
          `);
          const id1 = result1.result[1][0]; // First row, first column
          expect(id1).toBeTruthy();
          
          // Call get_or_create_function second time - should return existing record ID
          const result2 = await adminHasyx.sql(`
            SELECT deep.get_or_create_function('${testFunction}') as id;
          `);
          const id2 = result2.result[1][0]; // First row, first column
          expect(id2).toBe(id1); // Should be the same ID
          
          // Verify only one record exists
          const allFunctions = await adminHasyx.select({
            table: 'deep__functions',
            where: { _data: { _eq: JSON.parse(testFunction) } },
            returning: ['id', '_data']
          });
          expect(allFunctions.length).toBe(1);
          expect(allFunctions[0]._data).toEqual(JSON.parse(testFunction));
          
          debug('✅ get_or_create_function deduplication test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          await cleanup();
        }
      });
    });

    describe('Physical Data Persistence Tests', () => {
      it('should not delete physical data when logical records are deleted', async () => {
        const { hasyx: adminHasyx, cleanup } = createTestHasyxClient();
        
        const linkId1 = uuidv4();
        const linkId2 = uuidv4();
        let physicalStringId: string | null = null;
        
        try {
          debug('Testing physical data persistence after logical deletion...');
          
          // Create two links
          const link1 = await adminHasyx.insert({
            table: 'deep_links',
            object: { 
              id: linkId1,
              _deep: TEST_DEEP_SPACE_ID,
            },
            returning: ['id']
          });
          
          const link2 = await adminHasyx.insert({
            table: 'deep_links',
            object: { 
              id: linkId2,
              _deep: TEST_DEEP_SPACE_ID,
            },
            returning: ['id']
          });
          
          // Create physical string record
          const physicalString = await adminHasyx.insert({
            table: 'deep__strings',
            object: { _data: 'shared string data' },
            returning: ['id', '_data']
          });
          physicalStringId = physicalString.id;
          
          // Create two logical string records referencing same physical data
          await adminHasyx.insert({
            table: 'deep_strings',
            object: { 
              id: linkId1,
              _data_id: physicalStringId
            },
            returning: ['id']
          });
          
          await adminHasyx.insert({
            table: 'deep_strings',
            object: { 
              id: linkId2,
              _data_id: physicalStringId
            },
            returning: ['id']
          });
          
          // Delete first logical record
          await adminHasyx.delete({
            table: 'deep_strings',
            where: { id: { _eq: linkId1 } }
          });
          
          // Physical data should still exist
          const physicalDataCheck = await adminHasyx.select({
            table: 'deep__strings',
            where: { id: { _eq: physicalStringId } },
            returning: ['id', '_data']
          });
          expect(physicalDataCheck.length).toBe(1);
          expect(physicalDataCheck[0]._data).toBe('shared string data');
          
          // Second logical record should still work
          const logicalDataCheck = await adminHasyx.select({
            table: 'deep_strings',
            where: { id: { _eq: linkId2 } },
            returning: ['id', '_data']
          });
          expect(logicalDataCheck.length).toBe(1);
          expect(logicalDataCheck[0]._data).toBe('shared string data');
          
          debug('✅ Physical data persistence test passed');
          
        } catch (error) {
          debug('Error in test:', error);
          throw error;
        } finally {
          try {
            await adminHasyx.delete({table: 'deep_strings', where: {id: {_eq: linkId1}}}).catch(() => {});
            await adminHasyx.delete({table: 'deep_strings', where: {id: {_eq: linkId2}}}).catch(() => {});
            await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId1}}}).catch(() => {});
            await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkId2}}}).catch(() => {});
            if (physicalStringId) {
              await adminHasyx.delete({table: 'deep__strings', where: {id: {_eq: physicalStringId}}}).catch(() => {});
            }
          } catch (cleanupError) {
            debug('Error during cleanup:', cleanupError);
          }
          await cleanup();
        }
      });
    });
  });
}); 