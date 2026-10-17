declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    PAYUNI_MER_ID?: string;
    PAYUNI_TEST_ACCESS?: string;
    PAYUNI_HASH_KEY?: string;
    PAYUNI_HASH_IV?: string;
    RESEND_API_KEY?: string;
    RESEND_FROM?: string;
    RESEND_REPLY_TO?: string;
    BUCKET?: R2Bucket;
  }
}
