import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Telemart } from '../wrappers/Telemart';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Telemart Smart Contract Tests', () => {
  let code: Cell;

  beforeAll(async () => {
    code = await compile('Telemart');
  });

  let blockchain: Blockchain;
  let deployer: SandboxContract<TreasuryContract>;
  let telemart: SandboxContract<Telemart>;

  beforeEach(async () => {
    blockchain = await Blockchain.create();
    blockchain.verbosity = {
      print: true,
      blockchainLogs: true,
      vmLogs: 'vm_logs_full',
      debugLogs: true,
    };

    telemart = blockchain.openContract(Telemart.createFromConfig({}, code));
    deployer = await blockchain.treasury('deployer');

    const deployResult = await telemart.sendDeploy(deployer.getSender(), toNano('0.05'));

    expect(deployResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      deploy: true,
      success: true,
      aborted: false,
    });
  });

  it('should deploy and initialize LAST_REQ_SEQNO to 0', async () => {
    const lastSeqno = await telemart.getLastSeqno();
    expect(lastSeqno).toEqual(0n);
  });

  /*it('should process a valid trade and update LAST_REQ_SEQNO', async () => {
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');
    const seqno = 1;
    const expireAt = Math.floor(Date.now() / 1000) + 60; // Expires in 60 seconds.
    const amount = toNano('10'); // Trade amount: 10 TON in nanotons.

    const tradeMsg = await telemart.sendTrade(deployer.getSender(), {
      seqno,
      expireAt,
      amount,
      seller: seller.address,
      buyer: buyer.address,
      value: toNano('0.02'),
    });

    const extResult = await blockchain.sendMessage(tradeMsg.result);
    expect(extResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: true,
    });

    const lastSeqnoAfter = await telemart.getLastSeqno();
    expect(lastSeqnoAfter).toEqual(BigInt(seqno));
  });*/

  /*it('should reject trade with incorrect seqno', async () => {
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');
    const incorrectSeqno = 2; // Incorrect seqno: valid seqno should be 1; we use 2 to simulate a replay.
    const expireAt = Math.floor(Date.now() / 1000) + 60;
    const amount = toNano('10');

    const tradeMsg = await telemart.sendTrade(deployer.getSender(), {
      seqno: incorrectSeqno,
      expireAt,
      amount,
      seller: seller.address,
      buyer: buyer.address,
      value: toNano('0.02'),
    });

    const extResult = await blockchain.sendMessage(tradeMsg.result);
    expect(extResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: false,
      exitCode: 102, // Expected error code for replay protection.
    });
  });*/

  /*it('should reject expired trade message', async () => {
    const seller = await blockchain.treasury('seller');
    const buyer = await blockchain.treasury('buyer');
    const seqno = 1;
    const expireAt = Math.floor(Date.now() / 1000) - 10; // Set expireAt in the past.
    const amount = toNano('10');

    const tradeMsg = await telemart.sendTrade(deployer.getSender(), {
      seqno,
      expireAt,
      amount,
      seller: seller.address,
      buyer: buyer.address,
      value: toNano('0.02'),
    });

    const extResult = await blockchain.sendMessage(tradeMsg.result);
    expect(extResult.transactions).toHaveTransaction({
      from: deployer.address,
      to: telemart.address,
      success: false,
      exitCode: 103, // Expected error code for expiration.
    });
  });*/
});
