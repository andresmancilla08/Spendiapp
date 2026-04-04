export interface Bank {
  id: string;
  name: string;
  category: 'traditional' | 'digital' | 'other';
}

export const COLOMBIAN_BANKS: Bank[] = [
  { id: 'bancolombia',  name: 'Bancolombia',          category: 'traditional' },
  { id: 'davivienda',   name: 'Davivienda',           category: 'traditional' },
  { id: 'bbva',         name: 'BBVA',                 category: 'traditional' },
  { id: 'bogota',       name: 'Banco de Bogotá',      category: 'traditional' },
  { id: 'colpatria',    name: 'Scotiabank Colpatria',  category: 'traditional' },
  { id: 'itau',         name: 'Itaú',                 category: 'traditional' },
  { id: 'occidente',    name: 'Banco de Occidente',   category: 'traditional' },
  { id: 'popular',      name: 'Banco Popular',        category: 'traditional' },
  { id: 'avvillas',     name: 'AV Villas',            category: 'traditional' },
  { id: 'cajasocial',   name: 'Banco Caja Social',    category: 'traditional' },
  { id: 'nequi',        name: 'Nequi',                category: 'digital'     },
  { id: 'daviplata',    name: 'Daviplata',            category: 'digital'     },
  { id: 'nubank',       name: 'Nubank',               category: 'digital'     },
  { id: 'lulo',         name: 'Lulo Bank',            category: 'digital'     },
  { id: 'rappipay',     name: 'RappiPay',             category: 'digital'     },
  { id: 'movii',        name: 'Movii',                category: 'digital'     },
  { id: 'efectivo',     name: 'Efectivo',             category: 'other'       },
];

export const BANK_CATEGORY_LABELS: Record<Bank['category'], string> = {
  traditional: 'Bancos tradicionales',
  digital: 'Billeteras digitales',
  other: 'Otros',
};
