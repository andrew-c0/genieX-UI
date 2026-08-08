/// Default port for the GenieX serve process.
pub const DEFAULT_PORT: u16 = 18181;

/// Default base URL for the GenieX server (used when no URL is provided).
pub const DEFAULT_BASE_URL: &str = "http://127.0.0.1:18181";

/// Default HTTP client timeout in seconds (for long-running streaming requests).
pub const HTTP_TIMEOUT_SECS: u64 = 300;

/// Number of readiness probe retries when starting the server.
pub const SERVER_STARTUP_PROBES: u32 = 15;

/// Delay between readiness probes during server startup (ms).
pub const SERVER_STARTUP_PROBE_DELAY_MS: u64 = 500;
