import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { IncomesService } from '../incomes.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('IncomesService', () => {
  let service: IncomesService;
  let prisma: {
    income: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      income: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [IncomesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(IncomesService);
  });

  it('create sempre grava o userId do usuario autenticado, nunca de fora', async () => {
    prisma.income.create.mockResolvedValue({
      id: '1',
      userId: 'user-a',
      description: 'Salario',
      amount: 5000,
      date: new Date('2026-08-01'),
    });

    await service.create('user-a', {
      description: 'Salario',
      amount: 5000,
      date: '2026-08-01',
    });

    expect(prisma.income.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-a' }) }),
    );
  });

  it('findOne retorna 404 (NotFoundException) quando o registro nao pertence ao usuario', async () => {
    prisma.income.findFirst.mockResolvedValue(null);

    await expect(service.findOne('income-de-outro-usuario', 'user-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.income.findFirst).toHaveBeenCalledWith({
      where: { id: 'income-de-outro-usuario', userId: 'user-b' },
    });
  });

  it('update usa updateMany com userId no where — nunca altera registro de outro usuario', async () => {
    prisma.income.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.update('income-de-outro-usuario', 'user-b', { description: 'Hack' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.income.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'income-de-outro-usuario', userId: 'user-b' } }),
    );
  });

  it('remove usa deleteMany com userId no where — nunca exclui registro de outro usuario', async () => {
    prisma.income.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove('income-de-outro-usuario', 'user-b')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(prisma.income.deleteMany).toHaveBeenCalledWith({
      where: { id: 'income-de-outro-usuario', userId: 'user-b' },
    });
  });

  it('findAll calcula o total somando apenas os itens retornados (ja filtrados por userId)', async () => {
    prisma.income.findMany.mockResolvedValue([
      { id: '1', userId: 'user-a', amount: 1000, description: 'A' },
      { id: '2', userId: 'user-a', amount: 2500, description: 'B' },
    ]);

    const result = await service.findAll('user-a', {});

    expect(result.total).toBe(3500);
    expect(prisma.income.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'user-a' }) }),
    );
  });
});
