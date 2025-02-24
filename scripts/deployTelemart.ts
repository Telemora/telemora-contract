import { toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import { compile, NetworkProvider } from '@ton/blueprint';

/**
 * Deployment script for the Telemart contract.
 */
export async function run(provider: NetworkProvider): Promise<void> {
  try {
    // Compile the Telemart contract.
    const code = await compile('Telemart');
    const telemart = provider.open(Telemart.createFromConfig({}, code));

    // Deploy the contract with an attached value (e.g., 0.05 TON).
    await telemart.sendDeploy(provider.sender(), toNano('0.05'));

    // Wait for deployment to complete.
    await provider.waitForDeploy(telemart.address);
    console.log(`Telemart deployed at ${telemart.address.toString()}`);
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}
