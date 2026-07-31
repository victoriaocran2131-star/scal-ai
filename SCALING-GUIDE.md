# Scal AI - Scaling to 1 Million Users Guide

## Overview

This guide covers the infrastructure changes needed to scale Scal AI from ~100 users to 1,000,000 users.

---

## Current vs Required Infrastructure

| Component | Current (Free Tier) | Required (1M Users) | Monthly Cost |
|-----------|---------------------|---------------------|--------------|
| **Render** | Free (750 hrs/mo) | Starter ($7/mo) | $7 |
| **MongoDB Atlas** | M0 Free (100 conns) | M30 Dedicated (~1000 conns) | $57 |
| **Redis** | None | Redis Cloud Free/Basic | $0-5 |
| **CDN** | None | Cloudflare Free | $0 |
| **Storage** | Local disk | Cloudflare R2 | $5-10 |
| **TOTAL** | $0 | | ~$70-80/mo |

---

## Step 1: Upgrade MongoDB Atlas (CRITICAL)

### Why
- M0 free tier: 100 concurrent connections, 512MB storage, ~10K records
- M30 dedicated: 1,000+ concurrent connections, 10GB+ storage, unlimited records

### How
1. Go to https://cloud.mongodb.com
2. Select your cluster → "Upgrade Cluster"
3. Choose **M30** (Shared RAM, 10GB Storage)
4. Select your region
5. Complete payment
6. Update connection string in `.env`:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/scalai?retryWrites=true&w=majority&maxPoolSize=50&minPoolSize=10
```

### Connection Pool Settings
The server.js now includes optimized connection pooling:
- `maxPoolSize: 50` - Up to 50 simultaneous connections
- `minPoolSize: 10` - Keep 10 connections ready
- `maxIdleTimeMS: 30000` - Close idle connections after 30s

---

## Step 2: Upgrade Render to Starter Tier

### Why
- Free tier: 750 hours/month (spins down after 15 min inactivity)
- Starter: Always-on, 512MB RAM, auto-scaling

### How
1. Go to https://dashboard.render.com
2. Select "scal-ai" service
3. Click "Upgrade" → "Starter"
4. Enable auto-scaling:
   - Min instances: 1
   - Max instances: 3
   - Target CPU: 70%

---

## Step 3: Add Redis for Caching (Optional but Recommended)

### Why
- Cache frequent queries (user profiles, food database)
- Reduce MongoDB load by 60-80%
- Store session data

### How (Redis Cloud Free)
1. Go to https://redis.com/try-free/
2. Create free account (30MB free)
3. Get connection URL
4. Add to `.env`:
```
REDIS_URL=redis://default:password@endpoint:port
```

---

## Step 4: Add Cloudflare CDN (Free)

### Why
- Serve static assets (HTML, CSS, JS) from edge locations
- Reduce server load by 40-60%
- Free SSL/HTTPS

### How
1. Sign up at https://cloudflare.com
2. Add your domain
3. Update DNS nameservers at your registrar
4. Enable "Proxy" (orange cloud) for your domain

---

## Step 5: Move Images to Cloudflare R2

### Why
- Local disk fills up quickly with user uploads
- R2 is S3-compatible, $0.015/GB storage
- Free tier: 10GB storage + 10M requests/month

### How
1. Create R2 bucket at Cloudflare
2. Update upload code to use S3 SDK
3. Store image URLs instead of files

---

## Code Changes Already Applied

### 1. Security & Rate Limiting
```javascript
// Rate limiting: 100 requests per 15 min per IP
app.use('/api/', limiter);

// Speed limiting: slow down after 50 requests
app.use('/api/', speedLimiter);

// Security headers
app.use(helmet());
```

### 2. Database Indexes
```javascript
// Optimized for high-scale queries
historySchema.index({ createdAt: -1 });
historySchema.index({ userId: 1, createdAt: -1 });
userSchema.index({ email: 1 });
userSchema.index({ 'subscription.active': 1 });
```

### 3. Health Check Endpoint
```
GET /health
```
Returns server status, MongoDB connection, memory usage.

### 4. Metrics Endpoint (Admin Only)
```
GET /api/metrics
```
Returns user counts, scan counts, server stats, database size.

---

## Scaling Capacity by Tier

| Users | MongoDB | Render | Redis | Estimated Cost |
|-------|---------|--------|-------|----------------|
| 0-100 | M0 Free | Free | Optional | $0/mo |
| 100-1K | M10 ($9) | Starter ($7) | Free | ~$16/mo |
| 1K-10K | M20 ($25) | Starter ($7) | Free | ~$32/mo |
| 10K-100K | M30 ($57) | Starter ($7) | Basic ($5) | ~$69/mo |
| 100K-1M | M40 ($170) | Standard ($25) | Pro ($30) | ~$225/mo |

---

## Performance Optimizations

### Database
- Connection pooling (50 connections)
- Compound indexes on frequently queried fields
- Pagination on all list endpoints
- Aggregation pipelines for stats

### Server
- Rate limiting (100 req/15min per IP)
- Response slowing after 50 requests
- Security headers (helmet.js)
- Graceful shutdown handling

### Frontend
- CDN for static assets
- Service worker caching (PWA)
- Image compression before upload
- Lazy loading of non-critical resources

---

## Monitoring Checklist

- [ ] MongoDB Atlas dashboard - connection count, storage, queries
- [ ] Render dashboard - CPU, memory, request count
- [ ] `/health` endpoint for uptime monitoring
- [ ] `/api/metrics` for app-specific stats
- [ ] Cloudflare analytics for traffic patterns

---

## Next Steps

1. **Immediate**: Upgrade MongoDB Atlas to M30
2. **This week**: Upgrade Render to Starter tier
3. **This month**: Add Redis caching
4. **Before 10K users**: Add Cloudflare CDN
5. **Before 100K users**: Move images to R2/S3

---

## Cost Optimization Tips

1. Start with M10 MongoDB, upgrade as needed
2. Use Render's auto-scaling to handle traffic spikes
3. Cache aggressively - most reads should hit Redis
4. Compress images on upload (max 1MB)
5. Use MongoDB Atlas free tier for development
