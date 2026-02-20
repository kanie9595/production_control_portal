import type { Request, Response, NextFunction } from "express";

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  maxRequests?: number; // Max requests per window
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

const store: RateLimitStore = {};

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000);

export function rateLimit(options: RateLimitOptions = {}) {
  const {
    windowMs = 60 * 1000, // 1 minute default
    maxRequests = 100,
    keyGenerator = (req: Request) => req.ip ?? "unknown",
    onLimitReached,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Increment count
    store[key].count++;

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - store[key].count));
    res.setHeader("X-RateLimit-Reset", store[key].resetTime);

    // Check if limit exceeded
    if (store[key].count > maxRequests) {
      if (onLimitReached) {
        onLimitReached(req, res);
      } else {
        res.status(429).json({
          error: "Too Many Requests",
          message: "Превышен лимит запросов. Пожалуйста, попробуйте позже.",
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
        });
      }
      return;
    }

    next();
  };
}

// Stricter rate limit for auth endpoints
export function authRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 attempts per 15 minutes
    keyGenerator: (req: Request) => `auth:${req.ip ?? "unknown"}`,
    onLimitReached: (req, res) => {
      res.status(429).json({
        error: "Too Many Requests",
        message: "Слишком много попыток входа. Пожалуйста, попробуйте через 15 минут.",
      });
    },
  });
}

// API rate limit
export function apiRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute
    keyGenerator: (req: Request) => `api:${req.ip ?? "unknown"}`,
  });
}