import { toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const telemoraCode = await compile('Telemora');

  const telemora = Telemora.createFromConfig(
    {
      admin: provider.sender().address,
      initialBalance: toNano('0.05'),
    },
    telemoraCode,
  );

  const openedContract = provider.open(telemora);

  if (await openedContract.isDeployed()) {
    provider.ui().write('Contract already deployed!');
  } else {
    provider.ui().write('Deploying contract...');

    await openedContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(telemora.address);

    provider.ui().write('Contract deployed successfully!');
  }

  provider.ui().write(`Initial telemora value`);
}
