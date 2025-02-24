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

/**
 * Configuration for Telemart.
 * Extend this type if needed.
 */
export type TelemartConfig = {};

/**
 * Converts a Telemart configuration into a Cell.
 * Currently returns an empty cell.
 */
export function telemartConfigToCell(config: TelemartConfig): Cell {
  return beginCell().endCell();
}

/**
 * Telemart contract wrapper.
 *
 * Provides helper methods for deployment and sending external trade messages.
 */
export class Telemart implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createFromAddress(address: Address) {
    return new Telemart(address);
  }

  static createFromConfig(config: TelemartConfig, code: Cell, workchain = 0) {
    const data = telemartConfigToCell(config);
    const init = { code, data };
    return new Telemart(contractAddress(workchain, init), init);
  }

  async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
    await provider.internal(via, {
      value,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      body: beginCell().endCell(),
    });
  }

  /**
   * Builds and sends an external trade message.
   *
   * The message body layout is:
   *   [ seqno: 32 bits ]
   *   [ expireAt: 32 bits ]
   *   [ amount: 64 bits ]
   *   [ seller address ]
   *   [ buyer address ]
   *
   * Note: The provider.external() method now accepts a single Cell.
   *
   * @param provider - The ContractProvider instance.
   * @param opts - Trade parameters.
   */
  async sendTrade(
    provider: ContractProvider,
    opts: {
      seqno: number;
      expireAt: number;
      amount: bigint;
      seller: Address;
      buyer: Address;
      value?: bigint;
    },
  ): Promise<void> {
    const body = beginCell()
      .storeUint(opts.seqno, 32)
      .storeUint(opts.expireAt, 32)
      .storeUint(opts.amount, 64)
      .storeAddress(opts.seller)
      .storeAddress(opts.buyer)
      .endCell();

    const msg = beginCell()
      .storeUint(0x18, 6)
      .storeAddress(this.address)
      .storeCoins(opts.value ?? toNano('0.02'))
      .storeUint(0, 1 + 4 + 4 + 64 + 32 + 1 + 1)
      .storeSlice(body.asSlice())
      .endCell();

    await provider.external(msg);
  }
}
