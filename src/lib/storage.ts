import { EquityBucket, Transaction, CompoundingScenario, UserProfile } from '@/types/finance';
import { supabase, isSupabaseConfigured } from './supabase/client';
import { generateUUID, isValidUUID } from './uuid';

const STORAGE_KEYS = {
  BUCKETS: 'neobrutal_equity_buckets_v1',
  TRANSACTIONS: 'neobrutal_transactions_v1',
  SCENARIOS: 'neobrutal_scenarios_v1',
  PROFILE: 'neobrutal_profile_v1',
};

// Zero Mock/Demo Data - Strict Real Data Baseline
export const DEFAULT_BUCKETS: EquityBucket[] = [];

export const DEFAULT_SCENARIOS: CompoundingScenario[] = [];

export const DEFAULT_PROFILE: UserProfile = {
  id: '',
  email: '',
  full_name: '',
  base_currency: 'IDR',
  monthly_income_baseline: 0,
  emergency_fund_target_months: 6,
};

// Unified Storage & Cloud Sync Adapter
export class FinanceStorage {
  // --- CLOUD SYNC METHODS (Supabase) ---
  static async fetchCloudData(userId: string): Promise<{
    buckets: EquityBucket[];
    transactions: Transaction[];
    scenarios: CompoundingScenario[];
    profile: UserProfile;
  } | null> {
    if (!isSupabaseConfigured || !userId || !isValidUUID(userId)) {
      return null;
    }

    try {
      const [bucketsRes, txRes, scRes, profileRes] = await Promise.all([
        supabase.from('equity_buckets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
        supabase.from('compounding_scenarios').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ]);

      if (bucketsRes.error) {
        console.warn('Cloud fetch warning (buckets):', bucketsRes.error.message);
      }
      if (txRes.error) {
        console.warn('Cloud fetch warning (transactions):', txRes.error.message);
      }

      // Read current local storage
      const localBuckets = this.getBuckets();
      const localTxs = this.getTransactions();
      const localScenarios = this.getScenarios();
      const localProfile = this.getProfile();

      const cloudBuckets = bucketsRes.data && !bucketsRes.error ? bucketsRes.data : null;
      const cloudTxs = txRes.data && !txRes.error ? txRes.data : null;
      const cloudScenarios = scRes.data && !scRes.error ? scRes.data : null;
      const cloudProfile = profileRes.data && !profileRes.error ? profileRes.data : null;

      // Reconcile Buckets
      let resolvedBuckets: EquityBucket[];
      if (cloudBuckets && cloudBuckets.length > 0) {
        resolvedBuckets = cloudBuckets;
      } else if (localBuckets.length > 0) {
        resolvedBuckets = localBuckets;
        // Sync local data up to cloud for this authenticated user
        for (const b of localBuckets) {
          this.saveBucket(b, userId);
        }
      } else {
        resolvedBuckets = [];
      }

      // Reconcile Transactions
      let resolvedTxs: Transaction[];
      if (cloudTxs && cloudTxs.length > 0) {
        resolvedTxs = cloudTxs;
      } else if (localTxs.length > 0) {
        resolvedTxs = localTxs;
        for (const t of localTxs) {
          this.saveTransaction(t, userId);
        }
      } else {
        resolvedTxs = [];
      }

      // Reconcile Scenarios
      let resolvedScenarios: CompoundingScenario[];
      if (cloudScenarios && cloudScenarios.length > 0) {
        resolvedScenarios = cloudScenarios;
      } else if (localScenarios.length > 0) {
        resolvedScenarios = localScenarios;
        for (const s of localScenarios) {
          this.saveScenario(s, userId);
        }
      } else {
        resolvedScenarios = [];
      }

      // Reconcile Profile
      const resolvedProfile: UserProfile = cloudProfile || localProfile || { ...DEFAULT_PROFILE, id: userId };

      // Update local storage cache
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(resolvedBuckets));
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(resolvedTxs));
        localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(resolvedScenarios));
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(resolvedProfile));
      }

      return {
        buckets: resolvedBuckets,
        transactions: resolvedTxs,
        scenarios: resolvedScenarios,
        profile: resolvedProfile,
      };
    } catch (err) {
      console.error('Failed to fetch cloud data from Supabase:', err);
      return null;
    }
  }

  // --- BUCKETS ---
  static getBuckets(): EquityBucket[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.BUCKETS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveBucket(bucket: EquityBucket, userId?: string): EquityBucket[] {
    const list = this.getBuckets();
    const bucketId = isValidUUID(bucket.id) ? bucket.id : generateUUID();
    const existingIndex = list.findIndex((b) => b.id === bucket.id || b.id === bucketId);
    let updated: EquityBucket[];

    const finalBucket: EquityBucket = {
      ...bucket,
      id: bucketId,
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = finalBucket;
    } else {
      updated = [{ ...finalBucket, created_at: new Date().toISOString() }, ...list];
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(updated));
    }

    // Async sync to Supabase if configured & authenticated
    if (isSupabaseConfigured && userId && isValidUUID(userId)) {
      supabase.from('equity_buckets').upsert({
        id: finalBucket.id,
        user_id: userId,
        name: finalBucket.name,
        category: finalBucket.category,
        current_balance: finalBucket.current_balance,
        target_allocation_pct: finalBucket.target_allocation_pct,
        is_liquid: finalBucket.is_liquid,
        color_hex: finalBucket.color_hex,
        notes: finalBucket.notes || null,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Cloud sync error (bucket):', error);
      });
    }

    return updated;
  }

  static deleteBucket(bucketId: string, userId?: string): EquityBucket[] {
    const list = this.getBuckets().filter((b) => b.id !== bucketId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(list));
    }

    if (isSupabaseConfigured && userId && isValidUUID(userId) && isValidUUID(bucketId)) {
      supabase.from('equity_buckets').delete().eq('id', bucketId).eq('user_id', userId).then(({ error }) => {
        if (error) console.error('Cloud delete error (bucket):', error);
      });
    }

    return list;
  }

  // --- TRANSACTIONS ---
  static getTransactions(): Transaction[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveTransaction(
    tx: Transaction,
    userId?: string
  ): { transactions: Transaction[]; buckets: EquityBucket[] } {
    const list = this.getTransactions();
    const txId = isValidUUID(tx.id) ? tx.id : generateUUID();
    const existingIndex = list.findIndex((t) => t.id === tx.id || t.id === txId);
    const isNew = existingIndex < 0;
    const oldTx = !isNew ? list[existingIndex] : null;

    const validBucketId = tx.bucket_id && isValidUUID(tx.bucket_id) ? tx.bucket_id : null;

    const finalTx: Transaction = {
      ...tx,
      id: txId,
      bucket_id: validBucketId,
      created_at: tx.created_at || new Date().toISOString(),
    };

    let updatedTxList: Transaction[];
    if (isNew) {
      updatedTxList = [finalTx, ...list];
    } else {
      updatedTxList = [...list];
      updatedTxList[existingIndex] = finalTx;
    }

    // Automatically reconcile assigned bucket balances
    let currentBuckets = this.getBuckets();
    if (finalTx.bucket_id) {
      currentBuckets = currentBuckets.map((b) => {
        if (b.id !== finalTx.bucket_id) return b;
        let delta = 0;
        if (isNew) {
          delta = finalTx.type === 'income' ? finalTx.amount : -finalTx.amount;
        } else if (oldTx) {
          const oldImpact = oldTx.type === 'income' ? oldTx.amount : -oldTx.amount;
          const newImpact = finalTx.type === 'income' ? finalTx.amount : -finalTx.amount;
          delta = newImpact - oldImpact;
        }
        return {
          ...b,
          current_balance: Math.max(0, b.current_balance + delta),
        };
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(currentBuckets));
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updatedTxList));
    }

    // Async sync to Supabase if configured & authenticated
    if (isSupabaseConfigured && userId && isValidUUID(userId)) {
      supabase.from('transactions').upsert({
        id: finalTx.id,
        user_id: userId,
        bucket_id: finalTx.bucket_id,
        type: finalTx.type,
        category: finalTx.category,
        amount: finalTx.amount,
        currency: finalTx.currency || 'IDR',
        date: finalTx.date,
        note: finalTx.note || null,
        is_recurring: finalTx.is_recurring || false,
        need_vs_want: finalTx.need_vs_want || 'need',
      }).then(({ error }) => {
        if (error) console.error('Cloud sync error (transaction):', error);
      });

      if (finalTx.bucket_id) {
        const affectedBucket = currentBuckets.find((b) => b.id === finalTx.bucket_id);
        if (affectedBucket && isValidUUID(affectedBucket.id)) {
          supabase.from('equity_buckets').update({
            current_balance: affectedBucket.current_balance,
            updated_at: new Date().toISOString(),
          }).eq('id', affectedBucket.id).eq('user_id', userId).then();
        }
      }
    }

    return { transactions: updatedTxList, buckets: currentBuckets };
  }

  static deleteTransaction(
    txId: string,
    userId?: string
  ): { transactions: Transaction[]; buckets: EquityBucket[] } {
    const list = this.getTransactions();
    const target = list.find((t) => t.id === txId);
    const filtered = list.filter((t) => t.id !== txId);

    let currentBuckets = this.getBuckets();
    if (target && target.bucket_id) {
      currentBuckets = currentBuckets.map((b) => {
        if (b.id !== target.bucket_id) return b;
        const delta = target.type === 'income' ? -target.amount : target.amount;
        return {
          ...b,
          current_balance: Math.max(0, b.current_balance + delta),
        };
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(currentBuckets));
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
    }

    if (isSupabaseConfigured && userId && isValidUUID(userId) && isValidUUID(txId)) {
      supabase.from('transactions').delete().eq('id', txId).eq('user_id', userId).then(({ error }) => {
        if (error) console.error('Cloud delete error (transaction):', error);
      });

      if (target?.bucket_id && isValidUUID(target.bucket_id)) {
        const affectedBucket = currentBuckets.find((b) => b.id === target.bucket_id);
        if (affectedBucket && isValidUUID(affectedBucket.id)) {
          supabase.from('equity_buckets').update({
            current_balance: affectedBucket.current_balance,
            updated_at: new Date().toISOString(),
          }).eq('id', affectedBucket.id).eq('user_id', userId).then();
        }
      }
    }

    return { transactions: filtered, buckets: currentBuckets };
  }

  // --- SCENARIOS ---
  static getScenarios(): CompoundingScenario[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEYS.SCENARIOS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static saveScenario(scenario: CompoundingScenario, userId?: string): CompoundingScenario[] {
    const list = this.getScenarios();
    const scenarioId = isValidUUID(scenario.id) ? scenario.id : generateUUID();
    const existingIndex = list.findIndex((s) => s.id === scenario.id || s.id === scenarioId);
    let updated: CompoundingScenario[];

    const validBucketId = scenario.bucket_id && isValidUUID(scenario.bucket_id) ? scenario.bucket_id : null;

    const finalScenario: CompoundingScenario = {
      ...scenario,
      id: scenarioId,
      bucket_id: validBucketId,
    };

    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = finalScenario;
    } else {
      updated = [finalScenario, ...list];
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));
    }

    if (isSupabaseConfigured && userId && isValidUUID(userId)) {
      supabase.from('compounding_scenarios').upsert({
        id: finalScenario.id,
        user_id: userId,
        bucket_id: finalScenario.bucket_id,
        title: finalScenario.title,
        principal_amount: finalScenario.principal_amount,
        annual_rate_pct: finalScenario.annual_rate_pct,
        compounding_frequency: finalScenario.compounding_frequency,
        contribution_amount: finalScenario.contribution_amount,
        contribution_frequency: finalScenario.contribution_frequency,
        time_horizon_years: finalScenario.time_horizon_years,
        expected_volatility_pct: finalScenario.expected_volatility_pct || 15,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Cloud sync error (scenario):', error);
      });
    }

    return updated;
  }

  static deleteScenario(id: string, userId?: string): CompoundingScenario[] {
    const list = this.getScenarios().filter((s) => s.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(list));
    }

    if (isSupabaseConfigured && userId && isValidUUID(userId) && isValidUUID(id)) {
      supabase.from('compounding_scenarios').delete().eq('id', id).eq('user_id', userId).then(({ error }) => {
        if (error) console.error('Cloud delete error (scenario):', error);
      });
    }

    return list;
  }

  // --- PROFILE ---
  static getProfile(): UserProfile {
    if (typeof window === 'undefined') return DEFAULT_PROFILE;
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    try {
      return JSON.parse(raw);
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  static updateProfile(profile: Partial<UserProfile>, userId?: string): UserProfile {
    const current = this.getProfile();
    const updated = { ...current, ...profile };
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updated));
    }

    if (isSupabaseConfigured && userId && isValidUUID(userId)) {
      supabase.from('profiles').upsert({
        id: userId,
        email: updated.email || null,
        full_name: updated.full_name || null,
        base_currency: updated.base_currency || 'IDR',
        monthly_income_baseline: updated.monthly_income_baseline || 0,
        emergency_fund_target_months: updated.emergency_fund_target_months || 6,
        updated_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Cloud sync error (profile):', error);
      });
    }

    return updated;
  }

  // --- EXPORT / IMPORT / RESET ---
  static exportFullDataset(): string {
    const data = {
      profile: this.getProfile(),
      buckets: this.getBuckets(),
      transactions: this.getTransactions(),
      scenarios: this.getScenarios(),
      exportedAt: new Date().toISOString(),
      version: '2.0-real',
    };
    return JSON.stringify(data, null, 2);
  }

  static importDataset(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof window !== 'undefined') {
        if (parsed.profile) localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(parsed.profile));
        if (parsed.buckets) localStorage.setItem(STORAGE_KEYS.BUCKETS, JSON.stringify(parsed.buckets));
        if (parsed.transactions) localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(parsed.transactions));
        if (parsed.scenarios) localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(parsed.scenarios));
      }
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  static clearAllData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.BUCKETS);
      localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
      localStorage.removeItem(STORAGE_KEYS.SCENARIOS);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
    }
  }
}
