# Security Setup Guide

## GitHub Secrets Configuration

### Required Secrets for Deployment

#### For All Environments (staging & production)

1. **SESSION_SECRET** (Critical)
   - Minimum length: 32 characters
   - Use cryptographically secure random string
   - Generate with: `openssl rand -base64 48`
   - Never reuse between environments
   - Rotate regularly (every 90 days recommended)

2. **CLOUDFLARE_API_TOKEN**
   - Create at: https://dash.cloudflare.com/profile/api-tokens
   - Required permissions:
     - Account: Cloudflare Workers Scripts (Edit)
     - Account: D1 (Edit)
     - Account: Workers KV Storage (Edit)
     - Account: Workers R2 Storage (Edit)

3. **CLOUDFLARE_ACCOUNT_ID**
   - Find at: https://dash.cloudflare.com/ (right sidebar)

### How to Configure Secrets

#### Repository-Level Secrets
```bash
# Navigate to: Settings → Secrets and variables → Actions → New repository secret
```

#### Environment-Specific Secrets
```bash
# Navigate to: Settings → Environments → [staging/production] → Add secret
```

### Generating SESSION_SECRET

```bash
# Option 1: OpenSSL (recommended)
openssl rand -base64 48

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Option 3: Python
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

### Setting Secrets via GitHub CLI

```bash
# Install GitHub CLI: https://cli.github.com/

# Set SESSION_SECRET for staging
gh secret set SESSION_SECRET --env staging --body "$(openssl rand -base64 48)"

# Set SESSION_SECRET for production
gh secret set SESSION_SECRET --env production --body "$(openssl rand -base64 48)"

# Set Cloudflare credentials
gh secret set CLOUDFLARE_API_TOKEN --body "your-token-here"
gh secret set CLOUDFLARE_ACCOUNT_ID --body "your-account-id-here"
```

## Security Audit in CI/CD

### CI Pipeline (Pull Requests)

The security audit runs automatically on every PR:

1. **Fast Check** - Type checking and CODEX rules
2. **Full Check** - Tests and build
3. **Security Audit** - Automated security checks against test server
4. **Security Gate** - Blocks PR merge if any check fails

### What Gets Checked

- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Cross-tenant access controls
- ✅ SQL injection protection
- ✅ Session cookie security (HttpOnly, Secure, SameSite)
- ✅ CORS policy configuration
- ✅ Authentication on sensitive routes

### Running Security Audit Locally

```bash
# Start development server
npm run dev

# In another terminal, run security audit
TEST_URL=http://localhost:5173 npm run security:audit

# Or against preview build
npm run build
npm run preview
TEST_URL=http://localhost:4173 npm run security:audit
```

## Deployment Security Checklist

Before deploying to production:

- [ ] SESSION_SECRET configured and validated (≥32 chars)
- [ ] All security audit checks passing
- [ ] HTTPS enforced (Cloudflare handles this)
- [ ] Database migrations applied
- [ ] Environment-specific secrets set
- [ ] No hardcoded secrets in code
- [ ] Security headers configured
- [ ] Rate limiting enabled (via KV namespace)

## Security Incident Response

If a security issue is discovered:

1. **Immediate Actions**
   - Rotate SESSION_SECRET immediately
   - Review access logs in Cloudflare dashboard
   - Disable affected features if necessary

2. **Investigation**
   - Run security audit: `npm run security:audit`
   - Check recent deployments
   - Review code changes

3. **Remediation**
   - Fix vulnerability
   - Add test case to prevent regression
   - Update security audit if needed

4. **Post-Incident**
   - Document incident
   - Update security procedures
   - Schedule security review

## Security Best Practices

### Session Management
- SESSION_SECRET must be unique per environment
- Rotate secrets regularly
- Never commit secrets to git
- Use GitHub Secrets for all sensitive data

### Access Control
- All admin routes require authentication
- Cross-tenant access is blocked
- Mod-mode requires explicit permission
- Session validation on every request

### Data Protection
- SQL injection protection via parameterized queries
- XSS protection via CSP headers
- CSRF protection via SameSite cookies
- Input validation on all forms

## Monitoring

### Cloudflare Dashboard
- Monitor worker invocations
- Check error rates
- Review security events
- Analyze traffic patterns

### GitHub Actions
- Review security audit results
- Monitor failed deployments
- Check secret rotation dates

## Support

For security concerns:
- Create private security advisory on GitHub
- Contact team lead directly
- Do not discuss vulnerabilities in public issues
