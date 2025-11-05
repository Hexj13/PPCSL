# Cloudflare Setup for Kupito Project

## Where is Cloudflare Configured?

**Important:** Cloudflare is configured **NOT in code**, but at the level of:
1. **DNS settings** of your domain
2. **Cloudflare control panel** (web interface)
3. **Server settings** (if needed)

The application code is already prepared for Cloudflare! ✅

## What's Already Configured in Code

### ✅ Backend Ready for Cloudflare

In `backend/src/main.ts` there is already:

```typescript
app.set('trust proxy', true);
```

This means your server:
- ✅ Correctly identifies real user IP through Cloudflare
- ✅ Works with `X-Forwarded-For` and `X-Real-IP` headers
- ✅ Correctly identifies IP for rate limiting and IP blocking

**No code changes needed!** ✅

## Step-by-Step Cloudflare Setup Instructions

### Step 1: Cloudflare Registration

1. Go to https://www.cloudflare.com
2. Click "Sign Up"
3. Create a free account
4. Confirm email

### Step 2: Add Domain

1. In Cloudflare panel click "Add a Site"
2. Enter your domain (e.g., `kupito.mk` or `kupito.com`)
3. Select free plan "Free"
4. Click "Continue"

### Step 3: DNS Records Scan

Cloudflare will automatically find your DNS records:
- A records (server IP address)
- CNAME records (subdomains)
- MX records (email, if any)

Verify that all records are found correctly.

### Step 4: Change DNS Servers

Cloudflare will provide you with **2 DNS servers** (e.g.):
- `alice.ns.cloudflare.com`
- `bob.ns.cloudflare.com`

**What you need to do:**

1. Log into your domain registrar's control panel
2. Find DNS server settings (Nameservers)
3. Replace current DNS servers with those provided by Cloudflare
4. Save changes

**Important:** DNS changes can take 24 to 48 hours for full propagation.

### Step 5: Configure DNS Records in Cloudflare

After connecting the domain, configure DNS records:

#### For Backend API:
```
Type: A
Name: @ (or api)
Content: [Your server IP address]
Proxy: ON (orange cloud) ✅
```

#### For Frontend:
```
Type: A (or CNAME if using different domain)
Name: @ (or www)
Content: [Your frontend server IP addresses]
Proxy: ON (orange cloud) ✅
```

**Important:** Enable "Proxy" (orange cloud) - this activates Cloudflare protection.

### Step 6: SSL/TLS Configuration

1. In Cloudflare panel go to **SSL/TLS**
2. Select **"Full (strict)"** mode
3. This ensures encryption between Cloudflare and your server

### Step 7: WAF (Web Application Firewall) Configuration

1. Go to **Security** → **WAF**
2. Enable **Managed Rules**
3. Activate basic protection rules

### Step 8: Caching Configuration

1. Go to **Caching** → **Configuration**
2. Configure caching rules:

**Cache:**
- ✅ Static files (CSS, JS, images)
- ✅ Car images from `/uploads/`

**Don't Cache (Bypass):**
- ❌ API endpoints (`/api/*`)
- ❌ Dynamic content

### Step 9: Rate Limiting Configuration (Optional)

Cloudflare also has its own rate limiting, but it works **in addition** to yours:

1. Go to **Security** → **Rate Limiting**
2. Create rules for critical endpoints
3. This complements your code-based rate limiting

**Recommendation:** Use your rate limiting as primary, Cloudflare as additional.

## Verification

### After setup, verify:

1. **DNS Works:**
   ```bash
   nslookup your-domain.com
   ```
   Should show Cloudflare IP (not your real IP)

2. **SSL Works:**
   - Open `https://your-domain.com`
   - Check that there's a green lock icon

3. **IP Detection:**
   - In backend logs check that IP is detected correctly
   - Cloudflare passes real IP in headers

4. **Protection Works:**
   - Try making many requests - Cloudflare should block them

## Important Settings for Your Project

### 1. Correct IP Address Passing

Your code is already configured (`trust proxy: true`), but ensure Cloudflare passes IP:

In Cloudflare panel:
- **Network** → **IP Geolocation** → Enable
- This helps your IP blocking work correctly

### 2. Image Caching

Configure caching rules for `/uploads/`:

In Cloudflare:
- **Caching** → **Page Rules**
- Create rule: `*/uploads/*`
- Setting: **Cache Level** → Cache Everything
- **Edge Cache TTL** → 1 month

This will speed up car image loading.

### 3. Don't Cache API

Important! API endpoints should not be cached:

- **Caching** → **Page Rules**
- Create rule: `*/api/*`
- Setting: **Cache Level** → Bypass

### 4. Bot Protection

In Cloudflare:
- **Security** → **Bots**
- Enable **Bot Fight Mode** (free)
- This additionally protects against bots

## What Changes After Connecting Cloudflare

### For Users:
- ✅ Faster image loading
- ✅ Secure HTTPS connection
- ✅ Stable operation even during attacks

### For You:
- ✅ Real server IP hidden
- ✅ DDoS protection at network level
- ✅ Traffic and attack analytics
- ✅ Automatic protection against known threats

### For Developers:
- ✅ **No code changes needed!**
- ✅ Code is already ready for Cloudflare
- ✅ `trust proxy: true` is already configured

## Troubleshooting

### Issue: IP Addresses Detected Incorrectly

**Solution:**
1. Ensure `trust proxy: true` in `main.ts` (already there ✅)
2. In Cloudflare: **Network** → enable **IP Geolocation**
3. Verify that server correctly reads headers

### Issue: API Being Cached

**Solution:**
1. In Cloudflare create Page Rule for `*/api/*`
2. Set **Cache Level** → **Bypass**
3. This disables caching for all API endpoints

### Issue: SSL Errors

**Solution:**
1. In Cloudflare: **SSL/TLS** → **Overview**
2. Set mode **"Full (strict)"**
3. Your server must have a valid SSL certificate

## Alternative: Using Without Cloudflare

If you don't want to use Cloudflare:

**Your code works without it!** ✅

Your current protection:
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ IP blocking
- ✅ Data validation

This is sufficient for operation, but Cloudflare adds:
- Additional layer of protection against large DDoS
- Faster image loading
- Real server IP hiding

## Summary

### Where it's configured:
- ❌ **NOT in code** - code is already ready ✅
- ✅ **In Cloudflare panel** (web interface)
- ✅ **In DNS settings** of your domain

### What you need to do:
1. Register on Cloudflare (free)
2. Add domain
3. Change DNS servers at registrar
4. Configure caching rules
5. Enable protection

### Setup time:
- ~30 minutes for basic setup
- 24-48 hours for DNS propagation

**Your code is already ready for Cloudflare!** No changes needed. ✅
