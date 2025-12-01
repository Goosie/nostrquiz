// Simple test version to isolate the import issue

export class NostrServiceSimple {
  constructor() {
    console.log('NostrServiceSimple created');
  }

  async connect() {
    console.log('Connect called');
    return true;
  }

  async getPublicKey() {
    return 'test-public-key';
  }

  async disconnect() {
    console.log('Disconnect called');
  }
}

export const nostrServiceSimple = new NostrServiceSimple();