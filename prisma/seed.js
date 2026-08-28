const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main(){for(const name of ['Alimentação','Moradia','Transporte','Lazer','Trabalho','Saúde','Outros']) await prisma.category.upsert({where:{name},update:{},create:{name}})}
main().finally(()=>prisma.$disconnect());
