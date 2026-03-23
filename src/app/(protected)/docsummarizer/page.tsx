'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Upload, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnalysisResult {
  fileName: string
  summary: string
  language: string
  lines: number
}

export default function DocSummarizerPage() {
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    setLoading(true)

    try {
      const newResults: AnalysisResult[] = []
      for (const file of acceptedFiles) {
        const content = await file.text()
        const lines = content.split('\n').length

        // Detect language from extension
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const languageMap: Record<string, string> = {
          ts: 'TypeScript', tsx: 'TypeScript (React)', js: 'JavaScript',
          jsx: 'JavaScript (React)', py: 'Python', go: 'Go', rs: 'Rust',
          java: 'Java', cs: 'C#', rb: 'Ruby', php: 'PHP', md: 'Markdown',
          json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML',
        }
        const language = languageMap[ext] ?? ext.toUpperCase()

        // Call AI to summarize
        const res = await fetch('/api/projects/summarize-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.slice(0, 10000), fileName: file.name }),
        })

        let summary = 'Unable to generate summary.'
        if (res.ok) {
          const data = await res.json()
          summary = data.summary ?? summary
        }

        newResults.push({ fileName: file.name, summary, language, lines })
      }
      setResults((prev) => [...newResults, ...prev])
      toast.success(`Analyzed ${acceptedFiles.length} file(s)`)
    } catch (error) {
      toast.error('Failed to analyze files. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.cs', '.rb', '.php'],
      'application/json': ['.json'],
    },
    disabled: loading,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Document Summarizer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload source files to get AI-powered summaries and insights
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-primary hover:bg-primary/5'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-gray-700">Analyzing files...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="h-10 w-10 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to select'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                TypeScript, JavaScript, Python, Go, Rust, Java, and more
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Analysis Results</h2>
          {results.map((result, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{result.fileName}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{result.language}</Badge>
                      <span className="text-xs text-muted-foreground">{result.lines} lines</span>
                    </div>
                  </div>
                  <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none text-sm text-gray-900 break-words">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: (props) => (
                        <pre className="overflow-x-auto bg-gray-900 rounded p-3 my-2 text-gray-100 text-xs whitespace-pre" {...props} />
                      ),
                      code: ({ className, children, ...props }: any) => {
                        const isBlock = !!className?.startsWith('language-')
                        return isBlock ? (
                          <code className={className} {...props}>{children}</code>
                        ) : (
                          <code className="bg-gray-100 text-gray-800 rounded px-1 text-xs" {...props}>{children}</code>
                        )
                      },
                    }}
                  >
                    {result.summary}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
