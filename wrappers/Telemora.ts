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
  admin_addr: Address;
  percent: number;
};

export function telemoraConfigToCell(config: TelemoraConfig): Cell {
  return beginCell().storeAddress(config.admin_addr).storeUint(config.percent, 9).endCell();
}

export const Opcodes = {
  OP_WITHDRAW_ADMIN: 0x01,
  OP_MAKE_PAYMENT: 0x02,
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

  async sendMakePayment(
    provider: ContractProvider,
    via: Sender,
    opts: {
      sellerAddress: Address;
      value: bigint;
      queryID?: number;
    },
  ) {
    const estimatedFeeBuffer = toNano('0.1');

    await provider.internal(via, {
      value: opts.value + estimatedFeeBuffer,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell()
        .storeUint(Opcodes.OP_MAKE_PAYMENT, 32)
        .storeUint(opts.queryID ?? 0, 64)
        .storeAddress(opts.sellerAddress)
        .endCell(),
    });
  }

  async getAdminAddress(provider: ContractProvider) {
    const result = await provider.get('get_admin_address', []);
    const adminAddress = result.stack.readAddressOpt();
    if (adminAddress) {
      return adminAddress.toString();
    }
    return null;
  }

  async getCommissionPercent(provider: ContractProvider) {
    const result = await provider.get('get_commission_percent', []);
    return result.stack.readNumber();
  }
}
