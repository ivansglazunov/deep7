import { Hasyx } from 'hasyx';
import { Hasura } from 'hasyx/lib/hasura';
import { v4 as uuidv4 } from 'uuid';
import Debug from 'deep7/lib/debug';
import { createApolloClient, HasyxApolloClient } from 'hasyx/lib/apollo';
import { Generator } from 'hasyx/lib/generator';
import schema from '../public/hasura-schema.json';
import dotenv from 'dotenv';

dotenv.config();

// Используем префикс deep7 для отладочных сообщений
const debug = Debug('test:hasyx-links');
const generate = Generator(schema as any);

// --- Test Configuration ---
const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL!;
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET!;

interface TestLink {
  id: string;
  _type?: string;
  _from?: string;
  _to?: string;
  _value?: string;
}

describe('Hasyx Links Integration Tests', () => {
  let adminHasyx: Hasyx;
  // let hasura: Hasura; // Keep if needed for other non-cleanup tasks, otherwise remove
  const testLinksData: TestLink[] = [];

  beforeAll(async () => {
    debug('🔧 Hasyx Links Test Setup: Initializing clients...');
    debug(`HASURA_URL: ${HASURA_URL}`);
    
    if (!HASURA_URL || !ADMIN_SECRET) {
      throw new Error('Missing HASURA_URL or ADMIN_SECRET in environment variables');
    }

    // Initialize Hasyx client with admin role
    const adminApolloClient = createApolloClient({
      url: HASURA_URL,
      secret: ADMIN_SECRET,
      ws: false,
    }) as HasyxApolloClient;
    adminHasyx = new Hasyx(adminApolloClient, generate);
    debug('✅ Hasyx client initialized successfully');

    // Create test links
    for (let i = 0; i < 3; i++) {
      const linkId = uuidv4();
      debug(`Creating test link ${i + 1} with ID: ${linkId}`);
      try {
        const createdLink = await adminHasyx.insert<TestLink>({
          table: 'deep_links',
          object: { id: linkId },
          returning: 'id'
        });
        
        debug(`Response from insert for link ${i + 1}:`, createdLink);
        
        if (!createdLink || !createdLink.id) {
          throw new Error(`Failed to create test link ${i + 1}`);
        }
        
        testLinksData.push({ id: createdLink.id });
        debug(`Created test link ${i + 1}: ${createdLink.id}`);
      } catch (error: any) {
        debug(`Error creating test link ${i + 1}: ${error.message}`);
        debug(`Error details:`, error);
        // Cleanup any created links if setup fails
        for (const link of testLinksData) {
          if (link.id) {
            await adminHasyx.delete({ 
              table: 'deep_links', 
              where: { id: { _eq: link.id } } 
            }).catch(err => debug(`Cleanup error: ${err.message}`));
          }
        }
        throw error;
      }
    }
    expect(testLinksData.length).toBe(3);
    debug('✅ Test Setup Complete - Created links:', testLinksData);
  }, 30000);

  afterAll(async () => {
    debug('🧹 Test Teardown: Cleaning up test data created in beforeAll...');
    if (adminHasyx && testLinksData.length > 0) {
      for (const link of testLinksData) {
        if (link.id) {
          try {
            const deleteResult = await adminHasyx.delete({
              table: 'deep_links',
              where: { id: { _eq: link.id } }
            });
            debug(`Deleted test link: ${link.id}, result:`, deleteResult);
          } catch (error: any) {
            debug(`Error deleting test link ${link.id}: ${error.message}`);
            debug(`Error details:`, error);
          }
        }
      }
    }
    debug('✅ Test Teardown Complete');
  }, 30000);

  // beforeEach will be empty as per instructions
  beforeEach(async () => {});

  describe('Basic CRUD Operations', () => {
    it('should perform CRUD operations on links', async () => {
      debug('Testing basic CRUD operations...');
      
      // Create a new link for this specific test to avoid interference
      const testLinkId = uuidv4();
      debug(`Creating new test link with ID: ${testLinkId}`);
      
      const initialLink = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { id: testLinkId },
        returning: 'id'
      });
      debug('Result of insert operation:', initialLink);
      expect(initialLink.id).toBe(testLinkId);

      // Test SELECT for the created link
      debug(`Selecting link with ID: ${testLinkId}`);
      
      // Используем массив для полей возврата
      const selectedLinks = await adminHasyx.select<TestLink[]>({
        table: 'deep_links',
        where: { id: { _eq: testLinkId } },
        returning: ['id', '_type', '_from', '_to', '_value']
      });
      
      debug('Result of select operation:', selectedLinks);
      debug('Type of selectedLinks:', typeof selectedLinks);
      
      // ДОБАВЛЯЕМ ОПЦИИ ОТЛАДКИ СТРУКТУРЫ РЕЗУЛЬТАТОВ
      if (Array.isArray(selectedLinks)) {
        debug('selectedLinks is an array with length:', selectedLinks.length);
        if (selectedLinks.length > 0) {
          debug('First item in array:', selectedLinks[0]);
        }
      }
      
      // Проверяем, что массив не пустой и первый элемент имеет ожидаемый ID
      expect(selectedLinks).toBeDefined();
      expect(Array.isArray(selectedLinks)).toBe(true);
      expect(selectedLinks.length).toBeGreaterThan(0);
      expect(selectedLinks[0].id).toBe(testLinkId);
      
      // Test UPDATE
      const newTypeId = uuidv4();
      debug(`Creating a link to use as _type with ID: ${newTypeId}`);
      
      // Reference a valid link for _type, can be one from beforeAll or newly created
      const typeTargetLink = await adminHasyx.insert<TestLink>({ 
        table: 'deep_links', 
        object: { id: newTypeId }, 
        returning: 'id' 
      });
      debug('Result of insert for type target:', typeTargetLink);

      debug(`Updating link ${testLinkId} to set _type to ${newTypeId}`);
      const updateResponse = await adminHasyx.update<{returning: TestLink[]}>({
        table: 'deep_links',
        where: { id: { _eq: testLinkId } },
        _set: { _type: typeTargetLink.id },
        returning: ['id', '_type']
      });
      
      debug('Result of update operation:', updateResponse);
      
      // Проверяем, что обновление выполнено успешно
      expect(updateResponse).toBeDefined();
      expect(updateResponse.returning).toBeDefined();
      expect(updateResponse.returning.length).toBeGreaterThan(0);
      const updatedLink = updateResponse.returning[0];
      expect(updatedLink.id).toBe(testLinkId);
      expect(updatedLink._type).toBe(typeTargetLink.id);
      
      // Verify update with select
      debug(`Verifying update by selecting link ${testLinkId} again`);
      const verifyLinks = await adminHasyx.select<TestLink[]>({
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
      const deleteResult = await adminHasyx.delete<{affected_rows: number, returning: {id: string}[]}>({
        table: 'deep_links',
        where: { id: { _eq: testLinkId } },
        returning: ['id']
      });
      
      debug('Result of delete operation:', deleteResult);
      debug('Type of deleteResult:', typeof deleteResult);
      
      expect(deleteResult).toBeDefined();
      expect(deleteResult.affected_rows).toBe(1);
      expect(deleteResult.returning[0].id).toBe(testLinkId);
      
      // Verify deletion
      debug(`Verifying deletion by selecting link ${testLinkId} again`);
      const deletedLinkArray = await adminHasyx.select<TestLink[]>({
        table: 'deep_links',
        where: { id: { _eq: testLinkId } },
        returning: ['id']
      });
      
      debug('Result of select after deletion:', deletedLinkArray);
      
      expect(deletedLinkArray).toEqual([]);
      
      // Cleanup the typeTargetLink
      debug(`Cleaning up type target link with ID: ${typeTargetLink.id}`);
      await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeTargetLink.id}}});
    }, 15000);
  });

  describe('Table Relationships', () => {
    it('should handle relationships between links and strings', async () => {
      debug('Testing table relationships...');
      
      // Create a base link for the string to reference
      const baseLinkIdForString = uuidv4();
      debug(`Creating base link for string with ID: ${baseLinkIdForString}`);
      
      const baseLink = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { id: baseLinkIdForString },
        returning: 'id'
      });
      debug('Result of insert for base link:', baseLink);

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
      
      // Create another link that will have its _value point to the string's link ID
      const linkingToValueId = uuidv4();
      debug(`Creating link with ID ${linkingToValueId} pointing to string link ${baseLinkIdForString}`);
      
      const linkWithValue = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { 
          id: linkingToValueId,
          _value: baseLinkIdForString // Point _value to the ID of the link associated with the string
        },
        returning: ['id', '_value']
      });
      
      debug('Result of insert for linking link:', linkWithValue);
      
      expect(linkWithValue).toBeDefined();
      expect(linkWithValue._value).toBe(baseLinkIdForString);
      
      // Verify relationship: select the link and its related string through the _value relationship
      debug(`Selecting string with ID: ${baseLinkIdForString}`);
      
      const selectedStrings = await adminHasyx.select<any[]>({
        table: 'deep_strings',
        where: { id: { _eq: baseLinkIdForString } },
        returning: ['id', '_data']
      });
      
      debug('Result of select for string:', selectedStrings);
      debug('Type of selectedStrings:', typeof selectedStrings);
      
      // Проверяем, что массив не пустой и первый элемент имеет ожидаемые данные
      expect(selectedStrings).toBeDefined();
      expect(Array.isArray(selectedStrings)).toBe(true);
      expect(selectedStrings.length).toBeGreaterThan(0);
      expect(selectedStrings[0]._data).toBe(stringData);
      
      // Cleanup
      debug('Cleaning up string and links data...');
      const cleanupResults = await Promise.all([
        adminHasyx.delete({table: 'deep_strings', where: {id: {_eq: baseLinkIdForString}}})
          .then(r => debug('Deleted string, result:', r))
          .catch(e => debug('Error deleting string:', e)),
        adminHasyx.delete({table: 'deep_links', where: {id: {_eq: linkingToValueId}}})
          .then(r => debug('Deleted linking link, result:', r))
          .catch(e => debug('Error deleting linking link:', e)),
        adminHasyx.delete({table: 'deep_links', where: {id: {_eq: baseLinkIdForString}}})
          .then(r => debug('Deleted base link, result:', r))
          .catch(e => debug('Error deleting base link:', e))
      ]);
      debug('Cleanup completed with results:', cleanupResults);
    }, 15000);
  });

  describe('Data Integrity', () => {
    it('should enforce referential integrity for _type link', async () => {
      debug('Testing referential integrity for _type link...');
      
      // Try to create a link with non-existent _type
      const nonExistentTypeId = uuidv4();
      debug(`Attempting to create a link with non-existent _type ID: ${nonExistentTypeId}`);
      
      await expect(adminHasyx.insert({
        table: 'deep_links',
        object: { 
          id: uuidv4(),
          _type: nonExistentTypeId // This ID does not exist in deep_links
        },
        returning: 'id'
      })).rejects.toThrow(); // Expect Hasura to throw a foreign key violation error
      
      debug('Insert with non-existent _type correctly failed with error');
      
      // Create a valid link to be used as a type
      const validTypeId = uuidv4();
      debug(`Creating a valid link to use as type with ID: ${validTypeId}`);
      
      const validType = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { id: validTypeId },
        returning: 'id'
      });
      debug('Result of insert for valid type:', validType);
      
      // Now try to reference it as _type - should succeed
      const newLinkId = uuidv4();
      debug(`Creating link ${newLinkId} with valid _type ${validTypeId}`);
      
      const link = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { 
          id: newLinkId,
          _type: validTypeId
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
    });

    it('should enforce referential integrity for all link fields (_type, _from, _to, _value)', async () => {
      debug('Testing referential integrity for all link fields...');
      
      // Generate non-existent IDs for testing
      const nonExistentIds = {
        type: uuidv4(),
        from: uuidv4(),
        to: uuidv4(),
        value: uuidv4()
      };
      
      // Test _type foreign key constraint
      debug(`Testing _type constraint with non-existent ID: ${nonExistentIds.type}`);
      await expect(adminHasyx.insert({
        table: 'deep_links',
        object: { 
          id: uuidv4(),
          _type: nonExistentIds.type
        },
        returning: 'id'
      })).rejects.toThrow();
      
      // Test _from foreign key constraint
      debug(`Testing _from constraint with non-existent ID: ${nonExistentIds.from}`);
      await expect(adminHasyx.insert({
        table: 'deep_links',
        object: { 
          id: uuidv4(),
          _from: nonExistentIds.from
        },
        returning: 'id'
      })).rejects.toThrow();
      
      // Test _to foreign key constraint
      debug(`Testing _to constraint with non-existent ID: ${nonExistentIds.to}`);
      await expect(adminHasyx.insert({
        table: 'deep_links',
        object: { 
          id: uuidv4(),
          _to: nonExistentIds.to
        },
        returning: 'id'
      })).rejects.toThrow();
      
      // Test _value foreign key constraint
      debug(`Testing _value constraint with non-existent ID: ${nonExistentIds.value}`);
      await expect(adminHasyx.insert({
        table: 'deep_links',
        object: { 
          id: uuidv4(),
          _value: nonExistentIds.value
        },
        returning: 'id'
      })).rejects.toThrow();
      
      debug('All referential integrity tests passed as expected');
    });

    it('should support nested insertion with relationships', async () => {
      debug('Testing nested insertion with relationships...');
      
      // Create type A
      const typeAId = uuidv4();
      debug(`Creating type A with ID: ${typeAId}`);
      const typeA = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { id: typeAId },
        returning: 'id'
      });
      expect(typeA.id).toBe(typeAId);
      
      // Create type B
      const typeBId = uuidv4();
      debug(`Creating type B with ID: ${typeBId}`);
      const typeB = await adminHasyx.insert<TestLink>({
        table: 'deep_links',
        object: { id: typeBId },
        returning: 'id'
      });
      expect(typeB.id).toBe(typeBId);
      
      // Perform nested insertion - create a typeA link pointing to a new typeB link
      debug('Performing nested insertion...');
      // Создаем сначала объект типа B
      const instanceB = await adminHasyx.insert<{id: string}>({
        table: 'deep_links',
        object: { _type: typeBId },
        returning: ['id']
      });
      
      debug(`Created instance B with ID: ${instanceB.id}`);
      
      // Теперь создаем объект типа A, который ссылается на B
      const instanceA = await adminHasyx.insert<{id: string}>({
        table: 'deep_links',
        object: { 
          _type: typeAId,
          _to: instanceB.id
        },
        returning: ['id']
      });
      
      debug('Result of insertion:', instanceA);
      expect(instanceA).toBeDefined();
      expect(instanceA.id).toBeDefined();
      
      // Verify the relationship was created correctly
      debug(`Verifying relationship for instance with ID: ${instanceA.id}`);
      const verification = await adminHasyx.select<any>({
        table: 'deep_links',
        where: { id: { _eq: instanceA.id } },
        returning: ['id', '_type', 'to { id, _type }']
      });
      
      debug('Verification result:', verification);
      expect(verification).toBeDefined();
      expect(Array.isArray(verification)).toBe(true);
      expect(verification.length).toBeGreaterThan(0);
      
      const verifiedInstanceA = verification[0];
      expect(verifiedInstanceA._type).toBe(typeAId);
      expect(verifiedInstanceA.to).toBeDefined();
      expect(verifiedInstanceA.to.id).toBe(instanceB.id);
      expect(verifiedInstanceA.to._type).toBe(typeBId);
      
      // Cleanup
      debug('Cleaning up test data...');
      // Delete instanceA first (which refers to instanceB via _to)
      await adminHasyx.delete({
        table: 'deep_links', 
        where: {id: {_eq: instanceA.id}}
      });
      
      // Then delete instanceB
      await adminHasyx.delete({
        table: 'deep_links', 
        where: {id: {_eq: instanceB.id}}
      });
      
      // Delete type A and B
      await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeAId}}});
      await adminHasyx.delete({table: 'deep_links', where: {id: {_eq: typeBId}}});
    }, 15000); // Увеличиваем таймаут до 15 секунд
  });
}); 