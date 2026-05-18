const fs = require('fs');
const path = require('path');
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_PUBLISHABLE_KEY,
  USE_SUPABASE,
  ROOT_DIR,
} = require('./env');

const supabaseModulePath = path.join(ROOT_DIR, 'node_modules', '@supabase', 'supabase-js');
const createSupabaseClient = fs.existsSync(supabaseModulePath)
  ? require('@supabase/supabase-js').createClient
  : null;

function createSupabaseAuthFallback(url, apiKey) {
  const authHeaders = (token) => ({
    apikey: apiKey,
    Authorization: `Bearer ${token || apiKey}`,
    'Content-Type': 'application/json',
  });

  const parseResponse = async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        data: null,
        error: {
          message:
            payload?.msg ||
            payload?.error_description ||
            payload?.error ||
            'Supabase request failed',
        },
      };
    }
    return { data: payload, error: null };
  };

  return {
    auth: {
      async signInWithPassword({ email, password }) {
        try {
          const response = await fetch(
            `${url}/auth/v1/token?grant_type=password`,
            {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({ email, password }),
            }
          );
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return {
            data: { user: data.user, session: data },
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
      async signUp({ email, password, options }) {
        try {
          const response = await fetch(`${url}/auth/v1/signup`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              email,
              password,
              data: options?.data || {},
            }),
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return {
            data: { user: data.user, session: data },
            error: null,
          };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
      async getUser(token) {
        try {
          const response = await fetch(`${url}/auth/v1/user`, {
            method: 'GET',
            headers: authHeaders(token),
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return { data: { user: data }, error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
      async refreshSession({ refresh_token }) {
        try {
          const response = await fetch(
            `${url}/auth/v1/token?grant_type=refresh_token`,
            {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({ refresh_token }),
            }
          );
          const { data, error } = await parseResponse(response);
          if (error) return { data: { session: null, user: null }, error };
          return {
            data: {
              session: data,
              user: data.user || null,
            },
            error: null,
          };
        } catch (error) {
          return {
            data: { session: null, user: null },
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
      async signOut(token) {
        try {
          await fetch(`${url}/auth/v1/logout`, {
            method: 'POST',
            headers: authHeaders(token),
          });
          return { error: null };
        } catch (error) {
          return {
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
      async resetPasswordForEmail(email, options = {}) {
        try {
          const body = { email };
          if (options.redirectTo) body.redirect_to = options.redirectTo;
          const response = await fetch(`${url}/auth/v1/recover`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(body),
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return { data, error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
      async updateUser(token, attributes) {
        try {
          const response = await fetch(`${url}/auth/v1/user`, {
            method: 'PUT',
            headers: authHeaders(token),
            body: JSON.stringify(attributes),
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return { data: { user: data }, error: null };
        } catch (error) {
          return {
            data: null,
            error: {
              message: error.message || 'Unable to reach Supabase Auth API',
            },
          };
        }
      },
    },
    storage: null,
  };
}

const SUPABASE_API_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;

const supabaseAdmin = USE_SUPABASE
  ? createSupabaseClient
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_API_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : createSupabaseAuthFallback(SUPABASE_URL, SUPABASE_API_KEY)
  : null;

const hasSupabaseDataApi = Boolean(
  supabaseAdmin && typeof supabaseAdmin.from === 'function'
);
const hasSupabaseStorageApi = Boolean(
  supabaseAdmin?.storage && typeof supabaseAdmin.storage.from === 'function'
);

module.exports = {
  supabaseAdmin,
  hasSupabaseDataApi,
  hasSupabaseStorageApi,
};
