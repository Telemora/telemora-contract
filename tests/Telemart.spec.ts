import { Cell, toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import '@ton/test-utils';
import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { compile } from '@ton/blueprint';

describe('Telemart Smart Contract Tests', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Telemart');
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let buyer: SandboxContract<TreasuryContract>;
  let seller: SandboxContract<TreasuryContract>;
  let marketOwner: SandboxContract<TreasuryContract>;
  let telemart: SandboxContract<Telemart>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();

    telemart = blockchain.openContract(Telemart.createFromConfig({ admin: deployer.address, initialBalance: toNano('0') }, code));
    deployer = await blockchain.treasury('deployer');

    const deployResult = await telemart.sendDeploy(deployer.getSender(), toNano('0.05'));

    buyer = await blockchain.treasury('buyer');
    seller = await blockchain.treasury('seller');
    marketOwner = await blockchain.treasury('marketOwner');

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      deploy: true,
      success: true,
    });
  });

  it('should correctly process a trade and distribute funds', async () => {
    const amount = toNano('50'); // Trade amount
    const reqSeqNo = 1;
    const expireAt = Math.floor(Date.now() / 1000) + 600; // Expires in 10 minutes

    // Buyer sends a trade request to the Telemart contract
    const result = await telemart.sendTradeRequest(buyer.getSender(), {
      buyer: buyer.address,
      seller: seller.address,
      amount,
      reqSeqNo,
      expireAt,
    });

    // Verify the transaction was successful
    expect(result.transactions).toHaveTransaction({
      from: buyer.address,
      to: telemart.address,
      success: true,
    });

    // Calculate expected balances
    const commission = (50 * 3) / 100; // 3% commission for amounts >= 40 TON
    const sellerAmount = 50 - commission;

    // Retrieve and verify balances
    const telemartBalance = await telemart.getContractBalance();
    const sellerBalance = await blockchain.getContract(seller.address);

    expect(telemartBalance).toBe(toNano(commission.toString()));
    expect(sellerBalance).toBe(toNano(sellerAmount.toString()));
  });

  it('should reject duplicate transactions (replay attack prevention)', async () => {
    const amount = toNano('50');
    const reqSeqNo = 2; // New sequence number
    const expireAt = Math.floor(Date.now() / 1000) + 600;

    // First trade request
    const firstResult = await telemart.sendTradeRequest(buyer.getSender(), {
      buyer: buyer.address,
      seller: seller.address,
      amount,
      reqSeqNo,
      expireAt,
    });

    expect(firstResult.transactions).toHaveTransaction({
      from: buyer.address,
      to: telemart.address,
      success: true,
    });

    // Attempt to send the same request again (should fail)
    await expect(
      telemart.sendTradeRequest(buyer.getSender(), {
        buyer: buyer.address,
        seller: seller.address,
        amount,
        reqSeqNo,
        expireAt,
      }),
    ).rejects.toThrow('Invalid sequence number. Possible replay attack.');
  });
});
