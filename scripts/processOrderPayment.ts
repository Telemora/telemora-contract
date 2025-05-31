import { Address, toNano } from '@ton/core';
import { Telemora } from '../wrappers/Telemora';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
  const ui = provider.ui();

  const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Telemora address'));

  if (!(await provider.isContractDeployed(address))) {
    ui.write(`Error: Contract at address ${address} is not deployed!`);
    return;
  }

  const telemora = provider.open(Telemora.createFromAddress(address));

  const telemoraBefore = await telemora.getTelemora();

  await telemora.sendIncrease(provider.sender(), {
    increaseBy: 1,
    value: toNano('0.05'),
  });

  ui.write('Waiting for telemora to increase...');

  let telemoraAfter = await telemora.getTelemora();
  let attempt = 1;
  while (telemoraAfter === telemoraBefore) {
    ui.setActionPrompt(`Attempt ${attempt}`);
    await sleep(2000);
    telemoraAfter = await telemora.getTelemora();
    attempt++;
  }

  ui.clearActionPrompt();
  ui.write('Telemora increased successfully!');
}