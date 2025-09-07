# Render Deployment Guide

## Prerequisites

1. **Redis Service**: You need a Redis instance for caching
2. **MongoDB**: Your existing MongoDB Atlas connection
3. **Environment Variables**: Configure all required variables

## Step 1: Add Redis Service

### Option A: Render Redis (Recommended)
1. Go to Render Dashboard
2. Click "New +" → "Redis"
3. Choose a plan:
   - **Free**: 25MB, 30 connections
   - **Starter**: 25MB, 30 connections ($7/month)
   - **Standard**: 100MB, 100 connections ($15/month)

### Option B: External Redis
- **Redis Cloud**: Free tier available
- **Upstash**: Free tier available
- **AWS ElastiCache**: Paid service

## Step 2: Environment Variables

Add these to your Render service environment variables:

```bash
# Database
MONGODB_URI=your-mongodb-atlas-connection-string

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Redis Configuration
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Environment
NODE_ENV=production

# Logging (Optional)
LOG_LEVEL=info
ENABLE_FILE_LOGGING=false

# Google OAuth (if using)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 3: Build Configuration

### Backend Build Command:
```bash
npm install
```

### Backend Start Command:
```bash
npm start
```

### Frontend Build Command:
```bash
npm run build
```

## Step 4: Verify Deployment

1. **Check Logs**: Go to Render dashboard → Your service → Logs
2. **Test Redis**: Look for "✅ Redis connected successfully" in logs
3. **Test API**: Make a request to your API endpoints
4. **Check Caching**: Look for cache hit/miss logs

## Step 5: Monitoring

### Logs Available in Render:
- **Console Logs**: All `console.log` and `logger.info` messages
- **Error Logs**: All `logger.error` messages
- **HTTP Logs**: All request/response logs

### Cache Monitoring:
- Cache hits/misses are logged
- Redis connection status is logged
- Performance metrics are logged

## Troubleshooting

### Redis Connection Issues:
1. Check Redis service is running
2. Verify environment variables
3. Check firewall settings
4. Test connection with Redis CLI

### Logging Issues:
1. Check `LOG_LEVEL` environment variable
2. Verify logger configuration
3. Check console output in Render logs

### Performance Issues:
1. Monitor Redis memory usage
2. Check cache hit rates
3. Review slow query logs

## Production Optimizations

### Redis Configuration:
- Use connection pooling
- Set appropriate TTL values
- Monitor memory usage
- Enable persistence if needed

### Logging Configuration:
- Use structured logging
- Set appropriate log levels
- Consider external log aggregation
- Monitor log volume

## Cost Estimation

### Render Services:
- **Web Service**: $7/month (Starter plan)
- **Redis**: $7/month (Starter plan)
- **Total**: ~$14/month

### External Services:
- **MongoDB Atlas**: Free tier available
- **Redis Cloud**: Free tier available
- **Total**: $0/month (free tier)

## Security Considerations

1. **Environment Variables**: Never commit secrets
2. **Redis Security**: Use strong passwords
3. **CORS**: Configure properly for production
4. **Rate Limiting**: Already configured
5. **JWT**: Use strong secret keys

## Backup Strategy

1. **Database**: MongoDB Atlas automatic backups
2. **Redis**: Consider persistence if critical
3. **Code**: Git repository
4. **Environment**: Document all variables

## Scaling Considerations

1. **Horizontal Scaling**: Multiple web service instances
2. **Redis Clustering**: For high availability
3. **Database**: MongoDB Atlas auto-scaling
4. **CDN**: For static assets

## Support

- **Render Documentation**: https://render.com/docs
- **Redis Documentation**: https://redis.io/docs
- **MongoDB Atlas**: https://docs.atlas.mongodb.com
