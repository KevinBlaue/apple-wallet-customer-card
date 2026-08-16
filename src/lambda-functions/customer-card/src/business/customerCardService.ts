import { randomUUID } from 'node:crypto';

export interface CustomerCard {
  readonly id: string;
  readonly name: string;
  readonly createdAt: string;
  readonly expiresAt: number;
}

export interface CustomerCardRepository {
  create(card: CustomerCard): Promise<void>;
  get(id: string): Promise<CustomerCard | undefined>;
}

export interface CustomerCardPassGenerator {
  generate(card: CustomerCard): Promise<Buffer>;
}

interface CustomerCardServiceDependencies {
  readonly repository: CustomerCardRepository;
  readonly passGenerator: CustomerCardPassGenerator;
  readonly cardTtlDays: number;
  readonly createId?: () => string;
  readonly now?: () => Date;
}

export class CustomerCardService {
  private readonly createId: () => string;
  private readonly now: () => Date;

  constructor(private readonly dependencies: CustomerCardServiceDependencies) {
    this.createId = dependencies.createId ?? randomUUID;
    this.now = dependencies.now ?? ((): Date => new Date());
  }

  async create(name: string): Promise<CustomerCard> {
    const createdAt = this.now();
    const card: CustomerCard = {
      id: this.createId(),
      name,
      createdAt: createdAt.toISOString(),
      expiresAt:
        Math.floor(createdAt.getTime() / 1000) + this.dependencies.cardTtlDays * 24 * 60 * 60,
    };
    await this.dependencies.repository.create(card);
    return card;
  }

  async generatePass(cardId: string): Promise<Buffer | undefined> {
    const card = await this.dependencies.repository.get(cardId);
    return card ? this.dependencies.passGenerator.generate(card) : undefined;
  }
}
