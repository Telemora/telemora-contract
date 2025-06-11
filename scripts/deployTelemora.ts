import { Telemora } from '../wrappers/Telemora';
import { compile, NetworkProvider } from '@ton/blueprint';
import { constants } from '../constants';

export async function run(provider: NetworkProvider) {
  const adminAddress = provider.sender().address;
  if (!adminAddress) {
    throw new Error('No admin address provided');
  }

  const telemora = provider.open(
    Telemora.createFromConfig(
      {
        adminAddress: adminAddress,
        commissionBps: constants.commissionBps,
      },
      await compile('Telemora'),
    ),
  );

  await telemora.sendDeploy(provider.sender(), constants.INIT_BALANCE);

  await provider.waitForDeploy(telemora.address);
}
