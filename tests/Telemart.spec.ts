import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Telemart Production', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Telemart');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let telemart: SandboxContract<Telemart>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        const ownerAddress = deployer.address;

        telemart = blockchain.openContract(Telemart.createFromConfig({ owner: ownerAddress }, code));

        if (!telemart) {
            throw new Error('Telemart contract is undefined after deployment.');
        }

        // Cast the contract instance to ensure TypeScript recognizes the `deploy` method
        const telemartDeployable = telemart as unknown as { deploy(sender: any, value: bigint): Promise<void> };

        // Ensure the correct method is called for deployment
        await telemartDeployable.deploy(deployer.getSender(), toNano('0.05'));

        // Fix: Instead of `waitForDeploy`, check state manually
        let contractState;
        for (let i = 0; i < 5; i++) {
            // Retry a few times
            contractState = await blockchain.provider(telemart.address).getState();
            if (contractState.state.type === 'active') break;
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait before retry
        }

        if (!contractState || contractState.state.type !== 'active') {
            throw new Error('Contract deployment failed.');
        }
    });

    it('should deploy successfully', async () => {
        const contractData = await blockchain.provider(telemart.address).getState();

        expect(contractData).toBeDefined();
        expect(contractData.state).toBe('active'); // Correctly checking contract deployment
    });

    it('should process a purchase correctly and apply the correct commission', async () => {
        const OP_PURCHASE = 0x01;
        const sellerAddress = deployer.address;
        const sellerAddressCell = beginCell().storeAddress(sellerAddress).endCell();
        const body = beginCell().storeUint(OP_PURCHASE, 32).storeRef(sellerAddressCell).endCell();

        const value = toNano('50'); // 50 TON
        const expectedCommission = (50 * 2) / 100; // 2% commission
        const expectedSellerAmount = value - toNano(expectedCommission.toString());

        // Ensure TypeScript correctly recognizes `sendInternal`
        const telemartInstance = telemart as unknown as SandboxContract<Telemart>;

        // Define an interface for the contract methods
        interface TelemartMethods {
            sendInternal(sender: any, params: { value: bigint; body: Cell }): Promise<any>;
        }

        // Cast with the defined interface
        const telemartWithMethods = telemartInstance as unknown as TelemartMethods;

        // Ensure `sendInternal` exists
        if (!telemartWithMethods.sendInternal) {
            throw new Error('sendInternal is not defined on telemartInstance.');
        }

        const res = await telemartWithMethods.sendInternal(deployer.getSender(), { value, body });

        expect(res).toBeDefined();
        expect(res.transactions).toBeDefined();
        expect(res.transactions.length).toBeGreaterThan(0);

        // Validate seller receives the correct amount
        expect(res.transactions).toHaveTransaction({
            to: sellerAddress,
            success: true,
            value: expectedSellerAmount,
        });

        // Validate commission transfer to owner
        expect(res.transactions).toHaveTransaction({
            to: telemart.address, // Owner's stored address in the contract
            success: true,
            value: toNano(expectedCommission.toString()),
        });
    });
});
