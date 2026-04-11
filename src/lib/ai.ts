import { GoogleGenerativeAI } from '@google/generative-ai'
import Groq from 'groq-sdk'

// Determine which AI provider to use
const AI_PROVIDER = process.env.AI_PROVIDER || 'groq' // 'groq' or 'gemini'

// Initialize Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
})

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const geminiModel = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
})

// Main AI function - automatically uses available provider
export const askAI = async (question: string, context: string): Promise<string> => {
  // Try Groq first (if API key available)
  if (process.env.GROQ_API_KEY) {
    try {
      return await askGroq(question, context)
    } catch (error: any) {
      console.error('Groq API error:', error)
      // Fall back to Gemini if Groq fails
      if (process.env.GEMINI_API_KEY) {
        console.log('Falling back to Gemini...')
        return await askGemini(question, context)
      }
      throw error
    }
  }

  // Fall back to Gemini
  if (process.env.GEMINI_API_KEY) {
    return await askGemini(question, context)
  }

  throw new Error('No AI provider configured. Please add GROQ_API_KEY or GEMINI_API_KEY to .env file.')
}

// Groq implementation (Llama 3.3 70B - very fast and free)
async function askGroq(question: string, context: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant helping developers understand GitHub repositories.
Always format your response using clear Markdown:
- Use ## or ### headings to organize sections
- Use bullet points (- item) or numbered lists for steps and multiple items
- Use \`inline code\` for file names, function names, and short code snippets
- Use fenced code blocks (\`\`\`language) for multi-line code
- Use **bold** for key terms and important points
- Add a blank line between paragraphs and sections
- Never write a wall of text — break ideas into structured sections`,
        },
        {
          role: 'user',
          content: `REPOSITORY CONTEXT:\n${context}\n\nUSER QUESTION: ${question}\n\nProvide a well-formatted, structured answer based on the context. If you cannot answer, say so politely.`,
        },
      ],
      model: 'llama-3.3-70b-versatile', // Fast and free
      temperature: 0.3,
      max_tokens: 1024,
    })

    return completion.choices[0]?.message?.content || 'No response generated.'
  } catch (error: any) {
    console.error('Groq API error:', error)

    // Check for rate limit errors
    if (error.status === 429) {
      throw new Error('⚠️ Groq API rate limit exceeded. Please try again in a moment.')
    }

    // Check for authentication errors
    if (error.status === 401 || error.status === 403) {
      throw new Error('❌ Groq API authentication failed. Please check your GROQ_API_KEY in .env file.')
    }

    throw new Error(`Groq API error: ${error.message || 'Unknown error'}`)
  }
}

// Gemini implementation (backup)
async function askGemini(question: string, context: string): Promise<string> {
  try {
    const prompt = `You are an AI assistant helping developers understand GitHub repositories.
Always format your response using clear Markdown:
- Use ## or ### headings to organize sections
- Use bullet points (- item) or numbered lists for steps and multiple items
- Use \`inline code\` for file names, function names, and short code snippets
- Use fenced code blocks (\`\`\`language) for multi-line code
- Use **bold** for key terms and important points
- Add a blank line between paragraphs and sections
- Never write a wall of text — break ideas into structured sections

REPOSITORY CONTEXT:
${context}

USER QUESTION: ${question}

Provide a well-formatted, structured Markdown answer. If you cannot answer based on the provided context, say so politely.`

    const response = await geminiModel.generateContent(prompt)
    return response.response.text()
  } catch (error: any) {
    console.error('Gemini API error:', error)

    // Check for rate limit errors
    if (error.status === 429 || error.message?.includes('quota')) {
      throw new Error('⚠️ Gemini API quota exceeded (20 requests/day limit). Consider using Groq instead - add GROQ_API_KEY to .env for 14,400 requests/day.')
    }

    // Check for authentication errors
    if (error.status === 401 || error.status === 403) {
      throw new Error('❌ Gemini API authentication failed. Please check your GEMINI_API_KEY in .env file.')
    }

    throw new Error(`Gemini API error: ${error.message || 'Unknown error'}`)
  }
}

// Code summarization (uses same provider logic)
export const summarizeCode = async (code: string, fileName: string): Promise<string> => {
  try {
    const codeSnippet = code.slice(0, 10000) // Limit to 10000 characters

    // Try Groq first
    if (process.env.GROQ_API_KEY) {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are an intelligent senior software engineer who specializes in onboarding junior software engineers onto projects.',
          },
          {
            role: 'user',
            content: `You are onboarding a junior software engineer and explaining to them the purpose of the ${fileName} file.\n\nHere is the code:\n---\n${codeSnippet}\n---\n\nGive a summary no more than 100 words of the code above.`,
          },
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 150,
      })

      return completion.choices[0]?.message?.content || ''
    }

    // Fall back to Gemini
    if (process.env.GEMINI_API_KEY) {
      const response = await geminiModel.generateContent([
        `You are an intelligent senior software engineer who specialises in onboarding junior software engineers onto projects.`,
        `You are onboarding a junior software engineer and explaining to them the purpose of the ${fileName} file.
Here is the code:
---
${codeSnippet}
---
Give a summary no more than 100 words of the code above`,
      ])

      return response.response.text()
    }

    console.warn('No AI provider configured for code summarization')
    return ''
  } catch (error: any) {
    console.error('Error summarizing code:', error)

    // Log rate limit warnings
    if (error.status === 429 || error.message?.includes('quota')) {
      console.warn('⚠️ AI quota exceeded during code summarization. Skipping this file.')
    }

    return ''
  }
}

// Commit summarization
export const summarizeCommit = async (diff: string): Promise<string> => {
  try {
    const model = process.env.GROQ_API_KEY ? groq : null

    if (model && process.env.GROQ_API_KEY) {
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are an expert programmer summarizing git diffs. Format: bullet points with file names in square brackets.`,
          },
          {
            role: 'user',
            content: `Summarize this git diff:\n\n${diff}`,
          },
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.3,
        max_tokens: 500,
      })

      return completion.choices[0]?.message?.content || ''
    }

    // Fall back to Gemini
    if (process.env.GEMINI_API_KEY) {
      const response = await geminiModel.generateContent([
        `You are an expert programmer, and you are trying to summarize a git diff.
Reminders about the git diff format:
For every file, there are a few metadata lines, like (for example):
\`\`\`
diff --git a/lib/index.js b/lib/index.js
index aadt691..bfef803 100644
--- a/lib/index.js
+++ b/lib/index.js
\`\`\`
This means that \`lib/index.js\` was modified in this commit. Note that this is only an example.
Then there is a specifier of the lines that were modified.

A line starting with \`+\` means it was added.
A line starting with \`-\` means that line was deleted.
A line that starts with neither \`+\` nor \`-\` is code given for context and better understanding.

EXAMPLE SUMMARY COMMENTS:
\`\`\`
* Raised the amount of returned recordings from \`10\` to \`100\` [packages/server/recordings_api.ts]
* Fixed a typo in the GitHub action name [.github/workflows/gpt-commit-summarizer.yml]
* Moved the \`octokit\` initialization to a separate file [src/octokit.ts]
* Added an OpenAI API for completions [packages/utils/apis/openai.ts]
\`\`\`
Most commits will have less comments than this examples list.
Do not include parts of the example in your summary.`,
        `Please summarise the following diff file: \n\n${diff}`,
      ])

      return response.response.text()
    }

    return ''
  } catch (error) {
    console.error('Error summarizing commit:', error)
    return ''
  }
}

// Code quality AI analysis for the Code Health dashboard
export interface CodeQualityAnalysis {
  errorHandlingScore: number
  duplicationScore: number
  documentationScore: number
  insights: string
}

export const analyzeCodeQuality = async (
  summaries: string[],
  sampleCode: string[],
): Promise<CodeQualityAnalysis> => {
  const summaryText = summaries.slice(0, 20).join('\n---\n')
  const codeText = sampleCode
    .slice(0, 5)
    .join('\n---\n')
    .slice(0, 8000)

  const prompt = `You are a senior software engineer performing a code quality review.

FILE SUMMARIES (what each file does):
${summaryText}

SAMPLE CODE (up to 5 files):
${codeText}

Analyze this codebase and return ONLY valid JSON with these exact fields:
{
  "errorHandlingScore": <integer 0-100, where 100 = excellent error handling throughout the codebase>,
  "duplicationScore": <integer 0-100, where 100 = no code duplication detected>,
  "documentationScore": <integer 0-100, where 100 = well documented with clear comments and JSDoc>,
  "insights": "<2-3 sentences summarizing the overall code quality. Mention specific strengths and the most important area to improve.>"
}

Be honest and critical. Base errorHandlingScore on patterns in the sample code. Base duplicationScore on repeated patterns visible in summaries. Base documentationScore on comment clarity.`

  const defaults: CodeQualityAnalysis = {
    errorHandlingScore: 50,
    duplicationScore: 50,
    documentationScore: 50,
    insights: 'AI analysis unavailable at this time.',
  }

  try {
    if (process.env.GROQ_API_KEY) {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
      })
      const text = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(text) as Record<string, unknown>
      return {
        errorHandlingScore: Math.min(100, Math.max(0, Number(parsed.errorHandlingScore) || 50)),
        duplicationScore: Math.min(100, Math.max(0, Number(parsed.duplicationScore) || 50)),
        documentationScore: Math.min(100, Math.max(0, Number(parsed.documentationScore) || 50)),
        insights: String(parsed.insights || defaults.insights),
      }
    }

    if (process.env.GEMINI_API_KEY) {
      const response = await geminiModel.generateContent(prompt)
      const text = response.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
        return {
          errorHandlingScore: Math.min(100, Math.max(0, Number(parsed.errorHandlingScore) || 50)),
          duplicationScore: Math.min(100, Math.max(0, Number(parsed.duplicationScore) || 50)),
          documentationScore: Math.min(100, Math.max(0, Number(parsed.documentationScore) || 50)),
          insights: String(parsed.insights || defaults.insights),
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing code quality:', error)
  }

  return defaults
}

// Security AI analysis for the Security Scan dashboard
export interface SecurityAIAnalysis {
  insights: string
}

export const analyzeSecurityFindings = async (
  findingsSummary: string[],
  sampleFindings: string[],
): Promise<SecurityAIAnalysis> => {
  const findingsText = findingsSummary.slice(0, 30).join('\n')
  const samplesText = sampleFindings.slice(0, 10).join('\n---\n').slice(0, 4000)

  const prompt = `You are a senior application security engineer reviewing a codebase scan report.

DETECTED SECURITY ISSUES:
${findingsText}

SAMPLE FINDINGS (raw snippets):
${samplesText}

Based on these findings, write a concise security assessment (2-4 sentences). Mention:
1. The most critical risk and why it matters
2. The most common issue pattern across the codebase
3. One specific, actionable fix recommendation

Return ONLY valid JSON:
{ "insights": "<your assessment here>" }`

  const defaults: SecurityAIAnalysis = { insights: 'AI security analysis unavailable at this time.' }

  try {
    if (process.env.GROQ_API_KEY) {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      })
      const text = completion.choices[0]?.message?.content ?? '{}'
      const parsed = JSON.parse(text) as Record<string, unknown>
      return { insights: String(parsed.insights || defaults.insights) }
    }

    if (process.env.GEMINI_API_KEY) {
      const response = await geminiModel.generateContent(prompt)
      const text = response.response.text()
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
        return { insights: String(parsed.insights || defaults.insights) }
      }
    }
  } catch (error) {
    console.error('Error analyzing security findings:', error)
  }

  return defaults
}

// Generate embeddings via Gemini REST API (bypasses SDK model resolution issues)
export const generateEmbedding = async (summary: string): Promise<number[]> => {
  try {
    if (!process.env.GEMINI_API_KEY) return []

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text: summary.slice(0, 8000) }] },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      console.error('Embedding API error:', res.status, err)
      return []
    }

    const data = await res.json() as { embedding?: { values?: number[] } }
    return data.embedding?.values ?? []
  } catch (error) {
    console.error('Error generating embedding:', error)
    return []
  }
}
