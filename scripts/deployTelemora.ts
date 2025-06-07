import { toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const adminAddress = provider.sender().address;
  if (!adminAddress) {
    throw new Error('No admin address provided');
  }

  const telemora = provider.open(
    Telemora.createFromConfig(
      {
        adminAddress: adminAddress,
        commissionBps: 500,
      },
      await compile('Telemora'),
    ),
  );

  await telemora.sendDeploy(provider.sender(), toNano('3'));

  await provider.waitForDeploy(telemora.address);
}
