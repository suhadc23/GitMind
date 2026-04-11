export type Severity = 'critical' | 'high' | 'medium'

export interface SecurityFinding {
  fileName: string
  severity: Severity
  category: string
  description: string
  snippet: string
}

export interface FileSecurityResult {
  fileName: string
  findings: SecurityFinding[]
  score: number // 0-100, higher = safer
}

// ─── Detection Rules ──────────────────────────────────────────────────────────

const RULES: Array<{
  category: string
  severity: Severity
  description: string
  pattern: RegExp
}> = [
  // Critical
  {
    category: 'Hardcoded Secret',
    severity: 'critical',
    description: 'Hardcoded API key or secret token detected',
    pattern: /(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{16,}['"`]/i,
  },
  {
    category: 'Hardcoded Password',
    severity: 'critical',
    description: 'Hardcoded password string detected',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"`][^'"`\s]{4,}['"`]/i,
  },
  {
    category: 'Code Injection',
    severity: 'critical',
    description: 'eval() usage can execute arbitrary code',
    pattern: /\beval\s*\(/,
  },
  {
    category: 'Code Injection',
    severity: 'critical',
    description: 'new Function() can execute arbitrary code',
    pattern: /new\s+Function\s*\(/,
  },
  {
    category: 'XSS',
    severity: 'critical',
    description: 'dangerouslySetInnerHTML with a variable — potential XSS vector',
    pattern: /dangerouslySetInnerHTML\s*=\s*\{\s*\{[^}]*__html\s*:/,
  },
  {
    category: 'SQL Injection',
    severity: 'critical',
    description: 'String concatenation inside SQL query — potential SQL injection',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\s[^'"]*\+\s*(?:req\.|params\.|body\.|query\.|\$\{)/i,
  },
  {
    category: 'Command Injection',
    severity: 'critical',
    description: 'exec() with dynamic input — potential command injection',
    pattern: /(?:exec|execSync|spawn|spawnSync)\s*\(\s*(?:`[^`]*\$\{|['"][^'"]*['"\s]*\+)/,
  },

  // High
  {
    category: 'XSS',
    severity: 'high',
    description: 'innerHTML assigned with a variable — potential XSS',
    pattern: /\.innerHTML\s*=\s*(?!['"`])[^;]+/,
  },
  {
    category: 'XSS',
    severity: 'high',
    description: 'document.write() with dynamic content',
    pattern: /document\.write\s*\([^)]*(?:\+|\$\{)/,
  },
  {
    category: 'Insecure HTTP',
    severity: 'high',
    description: 'HTTP (non-HTTPS) URL used in fetch/axios call',
    pattern: /(?:fetch|axios\.get|axios\.post|axios\.put|axios\.delete)\s*\(\s*['"`]http:\/\/(?!localhost|127\.0\.0\.1|0\.0\.0\.0)/,
  },
  {
    category: 'Sensitive Logging',
    severity: 'high',
    description: 'console.log of potentially sensitive data (password/token/secret/key)',
    pattern: /console\.log\s*\([^)]*(?:password|token|secret|api[_-]?key|auth)[^)]*\)/i,
  },
  {
    category: 'Prototype Pollution',
    severity: 'high',
    description: 'Assignment to __proto__ can corrupt the object prototype chain',
    pattern: /__proto__\s*=/,
  },
  {
    category: 'Open Redirect',
    severity: 'high',
    description: 'Redirect using unvalidated user input',
    pattern: /(?:res\.redirect|window\.location(?:\.href)?\s*=)\s*(?:req\.|params\.|body\.|query\.|\$\{)/,
  },

  // Medium
  {
    category: 'Weak Randomness',
    severity: 'medium',
    description: 'Math.random() used for security-sensitive value (tokens/IDs) — use crypto.randomUUID() instead',
    pattern: /Math\.random\s*\(\s*\)[^;]*(?:token|id|key|secret|session|nonce)/i,
  },
  {
    category: 'Weak Hash',
    severity: 'medium',
    description: 'MD5 or SHA1 are cryptographically broken — use SHA-256 or better',
    pattern: /(?:md5|sha1|sha-1)\s*\(/i,
  },
  {
    category: 'Missing Input Validation',
    severity: 'medium',
    description: 'req.body used directly without visible validation',
    pattern: /req\.body\.[\w]+[^;\n]*(?:db\.|prisma\.|query\.|sql)/i,
  },
  {
    category: 'Insecure Cookie',
    severity: 'medium',
    description: 'Cookie set without httpOnly or secure flags',
    pattern: /(?:res\.cookie|document\.cookie\s*=)[^;]*(?!httpOnly)(?!secure)/i,
  },
  {
    category: 'Debug Code',
    severity: 'medium',
    description: 'debugger statement left in production code',
    pattern: /\bdebugger\b/,
  },
  {
    category: 'Hardcoded IP',
    severity: 'medium',
    description: 'Hardcoded IP address — use environment variables instead',
    pattern: /['"`]\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}['"`]/,
  },
]

// File extensions worth scanning
const SCANNABLE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|php|go|java|cs)$/i

// ─── Per-file analysis ────────────────────────────────────────────────────────

export function analyzeFileSecurity(fileName: string, sourceCode: string): FileSecurityResult {
  if (!SCANNABLE_EXT.test(fileName)) {
    return { fileName, findings: [], score: 100 }
  }

  const lines = sourceCode.split('\n')
  const findings: SecurityFinding[] = []

  for (const rule of RULES) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? ''
      // Skip comment-only lines
      if (/^\s*(?:\/\/|#|\/\*)/.test(line)) continue
      if (rule.pattern.test(line)) {
        findings.push({
          fileName,
          severity: rule.severity,
          category: rule.category,
          description: rule.description,
          snippet: line.trim().slice(0, 120),
        })
        break // one finding per rule per file to avoid noise
      }
    }
  }

  // Score: start at 100, deduct per finding
  const deductions = { critical: 25, high: 12, medium: 5 }
  const totalDeduction = findings.reduce((s, f) => s + deductions[f.severity], 0)
  const score = Math.max(0, 100 - totalDeduction)

  return { fileName, findings, score }
}

// ─── Aggregate stats ──────────────────────────────────────────────────────────

export interface SecuritySummary {
  criticalCount: number
  highCount: number
  mediumCount: number
  totalIssues: number
  overallScore: number
  topFindings: SecurityFinding[] // worst 20 for storage
}

export function computeSecuritySummary(results: FileSecurityResult[]): SecuritySummary {
  const allFindings = results.flatMap((r) => r.findings)

  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length
  const highCount = allFindings.filter((f) => f.severity === 'high').length
  const mediumCount = allFindings.filter((f) => f.severity === 'medium').length
  const totalIssues = allFindings.length

  // Overall score: start at 100, deduct by severity (capped at 0)
  const score = Math.max(
    0,
    100 - criticalCount * 20 - highCount * 8 - mediumCount * 3,
  )

  // Sort findings: critical first, then high, then medium
  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2 }
  const topFindings = [...allFindings]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 20)

  return { criticalCount, highCount, mediumCount, totalIssues, overallScore: score, topFindings }
}
