import { toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider): Promise<void> {
  try {
    const code = await compile('Telemora');
    const telemora = provider.open(Telemora.createFromConfig({}, code));
    await telemora.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(telemora.address);
    console.log(`Telemora deployed at ${telemora.address.toString()}`);
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}
