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
        admin_addr: adminAddress,
        percent: 500
      },
      await compile('Telemora',
    ),
  );

  await telemora.sendDeploy(provider.sender(), toNano('0.05'));

  await provider.waitForDeploy(telemora.address);

  console.log('Admin Address', await telemora.getAdminAddress());
  console.log('Commission Percent', await telemora.getCommissionPercent());
}
