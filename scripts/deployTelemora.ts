import { toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
  const counter = provider.open(
    Telemora.createFromConfig(
      {
        id: Math.floor(Math.random() * 10000),
        counter: 0,
      },
      await compile('Counter')
    )
  );

  await counter.sendDeploy(provider.sender(), toNano('0.05'));

  await provider.waitForDeploy(counter.address);

  // console.log('ID', await counter.getID());
}
