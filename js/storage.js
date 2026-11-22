// =====================================================================
// ระบบจัดเก็บข้อมูล & ล็อกอินส่วนตัว (Supabase Cloud + Local Fallback)
// =====================================================================

window.StudyTracker = window.StudyTracker || {};

(function (ns) {
const LOCAL_STORAGE_KEY = 'personal_study_tracker_v1';

class StorageService {
  constructor() {
    const cfg = window.APP_CONFIG || {};
    this.supabaseUrl = (cfg.SUPABASE_URL || '').trim();
    this.supabaseKey = (cfg.SUPABASE_ANON_KEY || '').trim();
    this.isCloudMode = Boolean(this.supabaseUrl && this.supabaseKey);
    this.client = null;
    this.user = null;
    this.lastUpdatedAt = null;

    if (this.isCloudMode && window.supabase) {
      this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    } else if (this.isCloudMode && !window.supabase) {
      console.warn('Supabase SDK failed to load; check internet connection.');
    }
  }

  async initAuth() {
    if (!this.isCloudMode || !this.client) {
      return { mode: 'local', user: null };
    }
    const { data, error } = await this.client.auth.getSession();
    if (error) {
      console.error('Auth session error:', error);
      return { mode: 'cloud', user: null, error: error.message };
    }
    this.user = data?.session?.user || null;
    return { mode: 'cloud', user: this.user };
  }

  async signIn(email, password) {
    if (!this.client) {
      throw new Error('ยังไม่ได้ตั้งค่า Supabase ในไฟล์ config.js');
    }
    const { data, error } = await this.client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      throw new Error(error.message === 'Invalid login credentials'
        ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
        : error.message);
    }
    this.user = data.user;
    return this.user;
  }

  async signOut() {
    if (this.client) {
      await this.client.auth.signOut();
    }
    this.user = null;
  }

  async loadState() {
    if (this.isCloudMode && this.client && this.user) {
      const { data, error } = await this.client
        .from('study_tracker_data')
        .select('payload, updated_at')
        .eq('user_id', this.user.id)
        .maybeSingle();

      if (error) {
        throw new Error(`โหลดข้อมูลจาก Supabase ไม่สำเร็จ: ${error.message}`);
      }

      if (data && data.payload && Object.keys(data.payload).length > 0) {
        this.lastUpdatedAt = data.updated_at;
        return { state: data.payload, source: 'cloud', updatedAt: data.updated_at };
      }

      // ถ้าเพิ่งเชื่อม Supabase ครั้งแรกและในเครื่องมีข้อมูลเก่า ให้ส่งสัญญาณว่ามี local backup
      const localDraft = this.loadLocalRaw();
      return { state: null, source: 'cloud_empty', localDraft };
    }

    const localData = this.loadLocalRaw();
    return { state: localData, source: 'local', updatedAt: localData?._updatedAt || null };
  }

  async saveState(state) {
    const timestamp = new Date().toISOString();
    const payload = { ...state, _updatedAt: timestamp };

    if (this.isCloudMode && this.client && this.user) {
      const { error } = await this.client
        .from('study_tracker_data')
        .upsert(
          {
            user_id: this.user.id,
            payload,
            updated_at: timestamp,
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        throw new Error(`บันทึกขึ้น Supabase ไม่สำเร็จ: ${error.message}`);
      }
      this.lastUpdatedAt = timestamp;
      return { source: 'cloud', updatedAt: timestamp };
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    this.lastUpdatedAt = timestamp;
    return { source: 'local', updatedAt: timestamp };
  }

  loadLocalRaw() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  clearLocalRaw() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
}

ns.StorageService = StorageService;
})(window.StudyTracker);
