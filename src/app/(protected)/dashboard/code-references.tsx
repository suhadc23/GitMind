'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { lucario } from 'react-syntax-highlighter/dist/esm/styles/prism'

type Props = {
  filesReferences: { fileName: string; sourceCode: string; summary: string }[]
}

export function CodeReferences({ filesReferences }: Props) {
  const [tab, setTab] = useState(filesReferences[0]?.fileName ?? '')

  if (filesReferences.length === 0) return null

  return (
    <div className="max-h-[30vh] overflow-scroll">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto flex gap-2 bg-gray-200 p-1 rounded-md">
          {filesReferences.map((file) => (
            <button
              key={file.fileName}
              onClick={() => setTab(file.fileName)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md ring-offset-background whitespace-nowrap transition-all ${
                tab === file.fileName
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {file.fileName}
            </button>
          ))}
        </div>

        {filesReferences.map((file) => (
          <TabsContent key={file.fileName} value={file.fileName} className="mt-2 rounded-md">
            <SyntaxHighlighter
              language="typescript"
              style={lucario}
              customStyle={{ margin: 0, borderRadius: '0.5rem', fontSize: '0.85rem' }}
            >
              {file.sourceCode}
            </SyntaxHighlighter>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
