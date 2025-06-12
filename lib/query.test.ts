import { describe, it, expect } from '@jest/globals';
import Debug from './debug';
import { newDeep } from './deep';
import { _invertFields, _oneRelationFields, _manyRelationFields, _allRelationFields } from './query';

const debug = Debug('query:test');

describe('Query Helper Constants', () => {
  let deep: any;

  beforeEach(() => {
    debug('🧪 Setting up test environment');
    deep = newDeep();
  });

  describe('_invertFields', () => {
    it('should have correct field mappings', () => {
      debug('🔍 Testing field mappings');
      
      // Test direct mappings
      expect(_invertFields['type']).toBe('typed');
      expect(_invertFields['typed']).toBe('type');
      expect(_invertFields['from']).toBe('out');
      expect(_invertFields['out']).toBe('from');
      expect(_invertFields['to']).toBe('in');
      expect(_invertFields['in']).toBe('to');
      expect(_invertFields['value']).toBe('valued');
      expect(_invertFields['valued']).toBe('value');
    });

    it('should be bidirectional (invertible)', () => {
      debug('🔄 Testing bidirectional mapping');
      
      // Every field should map to another field that maps back to it
      for (const [key, value] of Object.entries(_invertFields)) {
        expect(_invertFields[value as keyof typeof _invertFields]).toBe(key);
        debug(`✅ ${key} ↔ ${value} mapping confirmed`);
      }
    });

    it('should cover all relation fields', () => {
      debug('🎯 Testing complete coverage');
      
      const allFields = Object.keys({ ..._oneRelationFields, ..._manyRelationFields });
      for (const field of allFields) {
        expect(_invertFields).toHaveProperty(field);
        debug(`✅ Field ${field} has inversion mapping`);
      }
    });
  });

  describe('_oneRelationFields', () => {
    it('should mark single relation fields correctly', () => {
      debug('🔍 Testing single relation field identification');
      
      expect(_oneRelationFields['type']).toBe(true);
      expect(_oneRelationFields['from']).toBe(true);
      expect(_oneRelationFields['to']).toBe(true);
      expect(_oneRelationFields['value']).toBe(true);
      
      // These should not be in one relation fields
      expect(_oneRelationFields['typed' as keyof typeof _oneRelationFields]).toBeUndefined();
      expect(_oneRelationFields['out' as keyof typeof _oneRelationFields]).toBeUndefined();
      expect(_oneRelationFields['in' as keyof typeof _oneRelationFields]).toBeUndefined();
      expect(_oneRelationFields['valued' as keyof typeof _oneRelationFields]).toBeUndefined();
    });
  });

  describe('_manyRelationFields', () => {
    it('should mark multiple relation fields correctly', () => {
      debug('🔍 Testing multiple relation field identification');
      
      expect(_manyRelationFields['typed']).toBe(true);
      expect(_manyRelationFields['out']).toBe(true);
      expect(_manyRelationFields['in']).toBe(true);
      expect(_manyRelationFields['valued']).toBe(true);
      
      // These should not be in many relation fields
      expect(_manyRelationFields['type' as keyof typeof _manyRelationFields]).toBeUndefined();
      expect(_manyRelationFields['from' as keyof typeof _manyRelationFields]).toBeUndefined();
      expect(_manyRelationFields['to' as keyof typeof _manyRelationFields]).toBeUndefined();
      expect(_manyRelationFields['value' as keyof typeof _manyRelationFields]).toBeUndefined();
    });
  });

  describe('_allRelationFields', () => {
    it('should combine both single and multiple relation fields', () => {
      debug('🔍 Testing combined relation fields');
      
      // Should include all single relation fields
      for (const field of Object.keys(_oneRelationFields)) {
        expect(_allRelationFields).toHaveProperty(field);
        debug(`✅ Single field ${field} included in all fields`);
      }
      
      // Should include all multiple relation fields
      for (const field of Object.keys(_manyRelationFields)) {
        expect(_allRelationFields).toHaveProperty(field);
        debug(`✅ Multiple field ${field} included in all fields`);
      }
    });

    it('should have exactly 8 relation fields total', () => {
      debug('🔢 Testing total field count');
      
      const fieldCount = Object.keys(_allRelationFields).length;
      expect(fieldCount).toBe(8); // 4 single + 4 multiple
      debug(`✅ Total field count: ${fieldCount}`);
    });
  });

  describe('Field Type Classification', () => {
    it('should correctly classify fields by type', () => {
      debug('🏷️ Testing field type classification');
      
      const singleFields = ['type', 'from', 'to', 'value'];
      const multipleFields = ['typed', 'out', 'in', 'valued'];
      
      for (const field of singleFields) {
        expect(_oneRelationFields[field as keyof typeof _oneRelationFields]).toBe(true);
        expect(_manyRelationFields[field as keyof typeof _manyRelationFields]).toBeUndefined();
        debug(`✅ ${field} correctly classified as single relation`);
      }
      
      for (const field of multipleFields) {
        expect(_manyRelationFields[field as keyof typeof _manyRelationFields]).toBe(true);
        expect(_oneRelationFields[field as keyof typeof _oneRelationFields]).toBeUndefined();
        debug(`✅ ${field} correctly classified as multiple relation`);
      }
    });
  });

  describe('Constant Consistency', () => {
    it('should maintain consistency between invert fields and field types', () => {
      debug('🔗 Testing consistency between constants');
      
      // Every field in _invertFields should be in either _oneRelationFields or _manyRelationFields
      for (const field of Object.keys(_invertFields)) {
        const isInSingle = _oneRelationFields.hasOwnProperty(field);
        const isInMultiple = _manyRelationFields.hasOwnProperty(field);
        
        expect(isInSingle || isInMultiple).toBe(true);
        debug(`✅ Field ${field} is properly categorized`);
      }
    });

    it('should have no overlap between single and multiple fields', () => {
      debug('🚫 Testing no overlap between field types');
      
      for (const field of Object.keys(_oneRelationFields)) {
        expect(_manyRelationFields.hasOwnProperty(field)).toBe(false);
        debug(`✅ Single field ${field} not in multiple fields`);
      }
      
      for (const field of Object.keys(_manyRelationFields)) {
        expect(_oneRelationFields.hasOwnProperty(field)).toBe(false);
        debug(`✅ Multiple field ${field} not in single fields`);
      }
    });
  });
}); 