// Test nostr-tools imports one by one
console.log('Testing nostr-tools imports...');

try {
  console.log('1. Importing SimplePool...');
  const { SimplePool } = require('nostr-tools');
  console.log('SimplePool imported successfully:', typeof SimplePool);
  
  console.log('2. Creating SimplePool instance...');
  const pool = new SimplePool();
  console.log('SimplePool instance created successfully:', pool);
  
} catch (error) {
  console.error('Error with SimplePool:', error);
}

try {
  console.log('3. Importing other functions...');
  const { Event, Filter, getEventHash, getPublicKey, nip19, generateSecretKey, getSignature } = require('nostr-tools');
  console.log('All functions imported successfully');
  
} catch (error) {
  console.error('Error with other imports:', error);
}

export const testService = 'test';