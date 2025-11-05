# Rate Limiting - Request Rate Limiting

## What is Rate Limiting?

**Rate Limiting** (request rate limiting) is a mechanism to protect the API from abuse by limiting the number of requests a user or IP address can make within a certain period of time.

### Why is it needed?

1. **DDoS Attack Protection** - prevents server overload from large numbers of requests
2. **Brute Force Attack Protection** - limits password guessing attempts
3. **Spam Protection** - prevents mass registration or SMS sending
4. **Fair Resource Usage** - ensures even distribution of load
5. **Resource Conservation** - reduces load on database and server

## Implementation in Application

### Global Rate Limiting

**Configuration:** Global guard configured in `app.module.ts` for all endpoints:
- **Limit:** 100 requests
- **Time Window:** 60 seconds (1 minute)
- **Applies to:** All endpoints by default

### Special Limits for Critical Endpoints

#### Authentication

**POST /api/auth/register** - Registration
- **Limit:** 5 requests per minute
- **Reason:** Preventing mass bot registration

**POST /api/auth/login** - Login
- **Limit:** 10 requests per minute
- **Reason:** Protection against password brute force attacks

**POST /api/auth/check-phone** - Phone Check
- **Limit:** 10 requests per minute
- **Reason:** Preventing spam checks

**POST /api/auth/send-sms** - Send SMS
- **Limit:** 3 requests per minute
- **Reason:** SMS spam protection (saving Twilio costs)

#### File Upload

**POST /api/upload/image** - Image Upload
- **Limit:** 20 requests per minute
- **Reason:** File uploads are resource-intensive, need to prevent abuse

### Additional Protection

**POST /api/auth/verify-sms** - SMS Code Verification
- Uses **IP-based brute force protection** (40 attempts per IP, 1-hour block)
- This is additional protection on top of rate limiting

## Technical Details

### Library Used

**@nestjs/throttler** - official NestJS module for rate limiting

### How It Works

1. Throttler tracks the number of requests from each IP address
2. When limit is exceeded, returns HTTP 429 (Too Many Requests)
3. Limits reset after the time window (TTL) expires

### Limit Configuration

Limits can be configured in two ways:

1. **Globally** - in `ThrottlerModule.forRoot()` for all endpoints
2. **Locally** - via `@Throttle()` decorator for specific endpoints

### Response Examples

**When limit is exceeded:**
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

## Recommendations

### Production Settings

For production, consider:
- Using Redis for storing counters (for scaling)
- Stricter limits for public endpoints
- Different limits for different user types (guest, authenticated, admin)

### Monitoring

Recommended to track:
- Number of blocked requests
- IP addresses exceeding limits
- Attack patterns or abuse

## Current Limits (Summary)

| Endpoint | Limit | Time Window | Reason |
|----------|-------|-------------|--------|
| All endpoints (default) | 100 | 60 sec | Basic protection |
| POST /api/auth/register | 5 | 60 sec | Registration spam protection |
| POST /api/auth/login | 10 | 60 sec | Brute force protection |
| POST /api/auth/check-phone | 10 | 60 sec | Spam protection |
| POST /api/auth/send-sms | 3 | 60 sec | SMS cost savings |
| POST /api/upload/image | 20 | 60 sec | Resource protection |

## Additional Information

Rate limiting works together with other security measures:
- ✅ IP-based brute force protection (for SMS)
- ✅ Helmet security headers
- ✅ Input validation
- ✅ JWT authentication

Together they provide comprehensive application protection.
