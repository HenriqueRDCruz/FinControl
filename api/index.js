const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const path = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const resource = path[0] || 'dashboard'; const id = path[1] ? Number(path[1]) : null;
    if (resource === 'dashboard' && req.method === 'GET') {
      const [transactions, investments] = await Promise.all([prisma.transaction.findMany({include:{category:true}}), prisma.investment.findMany()]);
      const receitas=transactions.filter(t=>t.type==='RECEITA').reduce((s,t)=>s+Number(t.amount),0);
      const despesas=transactions.filter(t=>t.type==='DESPESA').reduce((s,t)=>s+Number(t.amount),0);
      const invested=investments.reduce((s,t)=>s+Number(t.currentValue),0);
      const byCategory={}; transactions.filter(t=>t.type==='DESPESA').forEach(t=>{byCategory[t.category.name]=(byCategory[t.category.name]||0)+Number(t.amount)});
      return res.json({receitas,despesas,saldo:receitas-despesas,investido:invested,byCategory});
    }
    if (resource === 'categories') {
      if(req.method==='GET') return res.json(await prisma.category.findMany({orderBy:{name:'asc'}}));
      if(req.method==='POST') return res.status(201).json(await prisma.category.create({data:{name:req.body.name}}));
      if(req.method==='PUT') return res.json(await prisma.category.update({where:{id},data:{name:req.body.name}}));
      if(req.method==='DELETE') { await prisma.category.delete({where:{id}}); return res.status(204).end(); }
    }
    if (resource === 'transactions') {
      if(req.method==='GET') return res.json(await prisma.transaction.findMany({include:{category:true},orderBy:{date:'desc'}}));
      const data={description:req.body.description,amount:req.body.amount,type:req.body.type,date:new Date(req.body.date),categoryId:Number(req.body.categoryId)};
      if(req.method==='POST') return res.status(201).json(await prisma.transaction.create({data,include:{category:true}}));
      if(req.method==='PUT') return res.json(await prisma.transaction.update({where:{id},data,include:{category:true}}));
      if(req.method==='DELETE') {await prisma.transaction.delete({where:{id}});return res.status(204).end();}
    }
    if (resource === 'investments') {
      if(req.method==='GET') return res.json(await prisma.investment.findMany({orderBy:{date:'desc'}}));
      const data={name:req.body.name,invested:req.body.invested,currentValue:req.body.currentValue,date:new Date(req.body.date)};
      if(req.method==='POST') return res.status(201).json(await prisma.investment.create({data}));
      if(req.method==='PUT') return res.json(await prisma.investment.update({where:{id},data}));
      if(req.method==='DELETE') {await prisma.investment.delete({where:{id}});return res.status(204).end();}
    }
    return res.status(404).json({error:'Rota não encontrada'});
  } catch(e){ console.error(e); return res.status(400).json({error:e.message}); }
};
