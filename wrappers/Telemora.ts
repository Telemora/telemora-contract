import {
  Address,
  beginCell,
  Cell,
  Contract,
  contractAddress,
  ContractProvider,
  Sender,
  SendMode,
  toNano,
} from '@ton/core';

const OP_PROCESS_ORDER_PAYMENT = 0x12345;

export class Telemora implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {
    this.address = address;
  }

  static createFromConfig(
    config: {
      admin?: Address;
      initialBalance: bigint;
    },
    code: Cell,
    workchain = 0,
  ): Telemora {
    const data = beginCell().storeAddress(config.admin).storeCoins(config.initialBalance).endCell();
    const init = { code, data };
    const address = contractAddress(workchain, init);
    return new Telemora(address, { code, data });
  }

  async isDeployed(provider: ContractProvider): Promise<boolean> {
    const { state } = await provider.getState();
    return state.type !== 'uninit';
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  async sendProcessOrderPayment(
    provider: ContractProvider,
    sender: Sender,
    args: {
      queryId?: bigint;
      orderId: bigint;
      sellerAddress: Address;
      marketplaceAddress: Address;
      commissionBps: number;
      amountFromSignedData: bigint;
      expiryTimestamp: number;
      signature: Buffer;
    }
  ) {
    if (args.signature.length !== 64) {
      throw new Error('Signature must be 64 bytes (512 bits)');
    }

    const body = beginCell()
      .storeUint(OP_PROCESS_ORDER_PAYMENT, 32)
      .storeUint(args.queryId || BigInt(0), 64)
      .storeUint(args.orderId, 64)
      .storeAddress(args.sellerAddress)
      .storeAddress(args.marketplaceAddress)
      .storeUint(args.commissionBps, 16)
      .storeCoins(args.amountFromSignedData)
      .storeUint(args.expiryTimestamp, 32)
      .storeBuffer(args.signature)
      .endCell();

    const estimatedFeeBuffer = toNano('0.1');

    await sender.send({
      to: this.address,
      value: args.amountFromSignedData + estimatedFeeBuffer,
      body,
      sendMode: SendMode.PAY_GAS_SEPARATELY
    });
  }
}
