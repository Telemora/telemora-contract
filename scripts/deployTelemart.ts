import { toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { Telemart } from '../wrappers/Telemart';

export async function run(provider: NetworkProvider) {
    const sender = provider.sender();
    if (!sender) {
        throw new Error('Provider sender is undefined.');
    }

    const ownerAddress = sender.address;
    if (!ownerAddress) {
        throw new Error('Owner address is undefined.');
    }

    const telemart = provider.open(Telemart.createFromConfig({ owner: ownerAddress }, await compile('Telemart')));

    // Ensure the method name and parameters are correct
    await telemart.sendDeploy(sender, toNano('0.05')); // Use the correct method name here
    await provider.waitForDeploy(telemart.address);
    console.log('Telemart deployed at:', telemart.address.toString());
}
