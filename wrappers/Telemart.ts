import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TelemartConfig = {};

export function telemartConfigToCell(config: TelemartConfig): Cell {
  // For now, no extra configuration – return an empty cell.
  return beginCell().endCell();
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
}
