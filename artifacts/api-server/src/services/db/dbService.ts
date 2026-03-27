import type { DbAdapter } from "./postgresAdapter";

let _adapter: DbAdapter | null = null;

export function getDbAdapter(): DbAdapter {
  if (_adapter) return _adapter;

  const provider = (process.env.ACTIVE_DATABASE ?? "postgresql").toLowerCase();

  switch (provider) {
    case "postgresql":
    case "postgres": {
      const { postgresAdapter } = require("./postgresAdapter");
      _adapter = postgresAdapter;
      break;
    }
    case "supabase": {
      const { supabaseAdapter } = require("./supabaseAdapter");
      _adapter = supabaseAdapter;
      break;
    }
    case "mongodb": {
      const { mongoAdapter } = require("./mongoAdapter");
      _adapter = mongoAdapter;
      break;
    }
    case "firebase": {
      const { firebaseAdapter } = require("./firebaseAdapter");
      _adapter = firebaseAdapter;
      break;
    }
    default:
      throw new Error(
        `[dbService] Unknown ACTIVE_DATABASE provider: "${provider}". ` +
          `Valid options: postgresql, supabase, mongodb, firebase`,
      );
  }

  return _adapter!;
}
