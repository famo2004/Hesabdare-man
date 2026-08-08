import Dexie, { type EntityTable } from 'dexie';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id?: number;
  type: TransactionType;
  amount: number;
  description: string; // Babat
  projectId?: number;
  branchId?: number;
  categoryId?: number;
  accountId?: number;
  card: string;
  date: string; // ISO String
  time?: string;
  attachment?: string; // Data URL
  createdAt: string;
}

export interface Account {
  id?: number;
  name: string;
  accountNumber: string;
  initialBalance: number;
}

export interface Project {
  id?: number;
  name: string;
  employer: string;
  startDate: string;
  status: 'active' | 'completed' | 'paused';
  budget: number;
}

export interface Branch {
  id?: number;
  name: string;
}

export interface Category {
  id?: number;
  name: string;
  type: 'income' | 'expense' | 'both';
}

export interface Setting {
  key: string;
  value: string;
}

const db = new Dexie('AccountingDB') as Dexie & {
  transactions: EntityTable<Transaction, 'id'>;
  projects: EntityTable<Project, 'id'>;
  branches: EntityTable<Branch, 'id'>;
  categories: EntityTable<Category, 'id'>;
  settings: EntityTable<Setting, 'key'>;
  accounts: EntityTable<Account, 'id'>;
};

db.version(1).stores({
  transactions: '++id, type, projectId, branchId, categoryId, card, date',
  projects: '++id, name, status',
  branches: '++id, name',
  categories: '++id, type',
  settings: 'key'
});

db.version(2).stores({
  transactions: '++id, type, projectId, branchId, categoryId, accountId, card, date',
  accounts: '++id, name'
}).upgrade(tx => {
  // Upgrade if needed
});

// Seed default categories if empty
db.on('populate', () => {
  db.categories.bulkAdd([
    { name: 'بتن', type: 'expense' },
    { name: 'فولاد', type: 'expense' },
    { name: 'سرامیک', type: 'expense' },
    { name: 'برق', type: 'expense' },
    { name: 'کابل', type: 'expense' },
    { name: 'کارگر', type: 'expense' },
    { name: 'حقوق', type: 'expense' },
    { name: 'غذا', type: 'expense' },
    { name: 'سوخت', type: 'expense' },
    { name: 'حمل و نقل', type: 'expense' },
    { name: 'تجهیزات', type: 'expense' },
    { name: 'متفرقه', type: 'both' },
    { name: 'پیش‌پرداخت', type: 'income' },
    { name: 'صورت‌وضعیت', type: 'income' },
  ]);
});

export { db };
