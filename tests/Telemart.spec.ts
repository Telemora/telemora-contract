import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Telemart', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Telemart');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let marketPlace: SandboxContract<Telemart>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        marketPlace = blockchain.openContract(Telemart.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await marketPlace.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: marketPlace.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // Deployment test is validated in beforeEach.
    });
});
