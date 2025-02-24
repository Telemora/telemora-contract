import { toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider): Promise<void> {
  try {
    const code = await compile('Telemart');
    const telemart = provider.open(Telemart.createFromConfig({}, code));
    await telemart.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(telemart.address);
    console.log(`Telemart deployed at ${telemart.address.toString()}`);
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}
