import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TelemartConfig = {};

export function telemartConfigToCell(config: TelemartConfig): Cell {
  return beginCell().endCell(); // Empty for now
}

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

  // Getter: Retrieve the last sequence number (used for replay protection)
  async getLastSeqno(provider: ContractProvider): Promise<bigint> {
    const result = await provider.get('get_last_seqno', []);
    return result.stack.readBigNumber(); // Assuming it returns a 64-bit integer
  }

  // Send a trade message (simulates a transaction)
  async sendTrade(
    provider: ContractProvider,
    via: Sender,
    opts: {
      seqno: number;
      expireAt: number;
      amount: bigint;
      seller: Address;
      buyer: Address;
      value?: bigint; // Attached value (default: 0.02 TON)
    },
  ): Promise<Cell> {
    const body = beginCell()
      .storeUint(opts.seqno, 32) // Store sequence number
      .storeUint(opts.expireAt, 32) // Expiration timestamp
      .storeUint(opts.amount, 64) // Amount in nanoTONs
      .storeAddress(opts.seller) // Seller address
      .storeAddress(opts.buyer) // Buyer address
      .endCell();

    await provider.internal(via, {
      value: opts.value ?? BigInt(2e7), // Default: 0.02 TON
      body,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
    });

    return body;
  }
}
