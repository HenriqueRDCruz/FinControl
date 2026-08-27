export type Tipo = 'RECEITA' | 'DESPESA';
export type Categoria = { id:number; nome:string; tipo:Tipo; cor:string };
export type Movimentacao = { id:number; descricao:string; valor:string|number; data:string; tipo:Tipo; categoriaId:number; categoria:Categoria };
export type Investimento = { id:number; nome:string; valorInvestido:string|number; valorAtual:string|number; data:string };
