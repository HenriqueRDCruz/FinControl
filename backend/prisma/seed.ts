import { PrismaClient, TipoMovimentacao } from '@prisma/client';
const prisma=new PrismaClient();
async function main(){for(const c of [{nome:'Salário',tipo:TipoMovimentacao.RECEITA,cor:'#16a34a'},{nome:'Freelance',tipo:TipoMovimentacao.RECEITA,cor:'#22c55e'},{nome:'Alimentação',tipo:TipoMovimentacao.DESPESA,cor:'#f97316'},{nome:'Moradia',tipo:TipoMovimentacao.DESPESA,cor:'#ef4444'},{nome:'Transporte',tipo:TipoMovimentacao.DESPESA,cor:'#8b5cf6'},{nome:'Lazer',tipo:TipoMovimentacao.DESPESA,cor:'#ec4899'}])await prisma.categoria.upsert({where:{nome:c.nome},update:{},create:c});}
main().finally(()=>prisma.$disconnect());
