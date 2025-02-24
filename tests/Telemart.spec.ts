import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

/**
 * Helper to build the external message body for a trade.
 * Layout:
 *   [ req_seqno: 32 bits ]
 *   [ expireAt: 32 bits ]
 *   [ amount: 64 bits ]
 *   [ seller address ]
 *   [ buyer address ]
 *
 * @param seqno - Request sequence number.
 * @param expireAt - Unix timestamp when the message expires.
 * @param amount - Trade amount in nanotons.
 * @param seller - Seller's address.
 * @param buyer - Buyer's address.
 * @returns A Cell representing the message body.
 */
function buildTradeBody(seqno: number, expireAt: number, amount: bigint, seller: Address, buyer: Address): Cell {
  return beginCell()
    .storeUint(seqno, 32)
    .storeUint(expireAt, 32)
    .storeUint(amount, 64)
    .storeAddress(seller)
    .storeAddress(buyer)
    .endCell();
}

describe('Telemart Contract', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Telemart');
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let telemart: SandboxContract<Telemart>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    telemart = blockchain.openContract(Telemart.createFromConfig({}, code));
    deployer = await blockchain.treasury('deployer');

    const deployResult = await telemart.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      deploy: true,
      success: true,
    });
  });

  it('should deploy successfully', async () => {
    const contractState = await blockchain.getContract(telemart.address);
    expect(contractState.balance).toBeGreaterThan(BigInt(0));
  });

  it('should process a valid trade correctly', async () => {
    const seqno = 1;
    const expireAt = Math.floor(Date.now() / 1000) + 60; // Expires in 1 minute
    const tradeAmount = BigInt(10_000_000_000); // 10 TON in nanotons
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');

    const body = buildTradeBody(seqno, expireAt, tradeAmount, seller.address, buyer.address);
    const result = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: true,
    });
  });

  it('should reject a trade with non-positive amount', async () => {
    const seqno = 1;
    const expireAt = Math.floor(Date.now() / 1000) + 60;
    const invalidAmount = BigInt(0);
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');

    const body = buildTradeBody(seqno, expireAt, invalidAmount, seller.address, buyer.address);
    const result = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: false,
      exitCode: 101,
    });
  });

  it('should reject a trade with wrong sequence number', async () => {
    const expireAt = Math.floor(Date.now() / 1000) + 60;
    const tradeAmount = BigInt(5_000_000_000);
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');

    // Incorrect seqno: expected 1 but provided 2.
    const body = buildTradeBody(2, expireAt, tradeAmount, seller.address, buyer.address);
    const result = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: false,
      exitCode: 102,
    });
  });

  it('should reject an expired trade', async () => {
    const seqno = 1;
    const expireAt = Math.floor(Date.now() / 1000) - 5; // Already expired
    const tradeAmount = BigInt(5_000_000_000);
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');

    const body = buildTradeBody(seqno, expireAt, tradeAmount, seller.address, buyer.address);
    const result = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body,
    });

    expect(result.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: false,
      exitCode: 103,
    });
  });

  it('should process sequential trades with increasing seqno', async () => {
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');
    const expireAt = Math.floor(Date.now() / 1000) + 60;
    const tradeAmount1 = BigInt(3_000_000_000);
    const tradeAmount2 = BigInt(7_000_000_000);

    // First trade: seqno 1.
    const body1 = buildTradeBody(1, expireAt, tradeAmount1, seller.address, buyer.address);
    const result1 = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body: body1,
    });
    expect(result1.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: true,
    });

    // Second trade: seqno 2.
    const body2 = buildTradeBody(2, expireAt, tradeAmount2, seller.address, buyer.address);
    const result2 = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body: body2,
    });
    expect(result2.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: true,
    });
  });

  it('should prevent replay attacks with the same seqno', async () => {
    const seqno = 1;
    const expireAt = Math.floor(Date.now() / 1000) + 60;
    const tradeAmount = BigInt(2_000_000_000);
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');

    const body = buildTradeBody(seqno, expireAt, tradeAmount, seller.address, buyer.address);

    // First call should succeed.
    const firstResult = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body,
    });
    expect(firstResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: true,
    });

    // Replay the same message with the same seqno should fail.
    const replayResult = await telemart.sendExternal(deployer.getSender(), {
      value: toNano('0.02'),
      body,
    });
    expect(replayResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: false,
      exitCode: 102,
    });
  });
});
