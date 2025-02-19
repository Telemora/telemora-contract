import { toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ownerAddress = provider.sender().address;
    const telemart = provider.open(
        Telemart.createFromConfig({ owner: ownerAddress }, await compile('Telemart'))
    );
    await telemart.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(telemart.address);
    console.log('Telemart deployed at:', telemart.address.toString());
}
