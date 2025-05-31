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

export type TelemoraConfig = {
  marketplaceAddress: Address;
  commissionBps: number;
};

export function telemoraConfigToCell(config: TelemoraConfig): Cell {
  return beginCell().storeAddress(config.marketplaceAddress).storeUint(config.commissionBps, 32).endCell();
}

export const Opcodes = {
  processOrderPayment: 0x7e8764ef,
};

export class Telemora implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Telemora(address);
  }

  static createFromConfig(config: TelemoraConfig, code: Cell, workchain = 0) {
    const data = telemoraConfigToCell(config);
    const init = { code, data };
    return new Telemora(contractAddress(workchain, init), init);
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
    via: Sender,
    opts: {
      queryID?: number;
      orderId: bigint;
      sellerAddress: Address;
      marketplaceAddress: Address;
      commissionBps: number;
      amountFromSignedData: bigint;
      expiryTimestamp: number;
      signature: Buffer;
      value: bigint;
    },
  ) {
    if (opts.signature.length !== 64) {
      throw new Error('Signature must be 64 bytes (512 bits)');
    }

    const estimatedFeeBuffer = toNano('0.1');

    await provider.internal(via, {
      value: opts.value + estimatedFeeBuffer,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.processOrderPayment, 32)
        .storeUint(opts.orderId, 64)
        .storeAddress(opts.sellerAddress)
        .storeAddress(opts.marketplaceAddress)
        .storeUint(opts.commissionBps, 16)
        .storeCoins(opts.amountFromSignedData)
        .storeUint(opts.expiryTimestamp, 32)
        .storeBuffer(opts.signature)
        .endCell()
    });
  }
}
